const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const GrpcServer = require('../src/grpc/server');

// Load proto file
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'document_generation', 'document_generation.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const documentGeneration = grpc.loadPackageDefinition(packageDefinition).document_generation;

describe('gRPC Document Service', () => {
    let client;
    let grpcServer;

    // Set longer timeout for gRPC tests
    jest.setTimeout(60000);

    beforeAll(async () => {
        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Start gRPC server
        grpcServer = new GrpcServer();
        await grpcServer.start();

        // Wait a bit for server to fully start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create gRPC client
        client = new documentGeneration.DocumentGenerationService('localhost:50051', grpc.credentials.createInsecure());
    });

    afterAll(async () => {
        // Clean up
        if (client) {
            client.close();
        }

        if (grpcServer) {
            await grpcServer.stop();
        }

        // Clean up any test files
        const tempDir = path.join(__dirname, '..', 'temp');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            files.forEach(file => {
                if (file.startsWith('test') || file.startsWith('html_output')) {
                    const filePath = path.join(tempDir, file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        }
    });

    describe('ConvertHtml gRPC Method', () => {
        const sampleHtml = '<html><body><h1>Test Document</h1><p>This is a test conversion.</p></body></html>';
        
        it('should return error when data is missing', (done) => {
            const request = {
                data: Buffer.alloc(0),
                input_format: 'html',
                output_format: 'pdf'
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(false);
                expect(response.error_message).toBe('HTML data is required.');
                done();
            });
        });

        it('should return error when input_format is missing', (done) => {
            const request = {
                data: Buffer.from(sampleHtml),
                input_format: '',
                output_format: 'pdf'
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(false);
                expect(response.error_message).toBe('Input format is required.');
                done();
            });
        });

        it('should return error when output_format is missing', (done) => {
            const request = {
                data: Buffer.from(sampleHtml),
                input_format: 'html',
                output_format: ''
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(false);
                expect(response.error_message).toBe('Output format is required.');
                done();
            });
        });

        it('should return error for invalid input format', (done) => {
            const request = {
                data: Buffer.from(sampleHtml),
                input_format: 'xml',
                output_format: 'pdf'
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(false);
                expect(response.error_message).toBe('Only HTML input format is supported.');
                done();
            });
        });

        it('should return error for invalid output format', (done) => {
            const request = {
                data: Buffer.from(sampleHtml),
                input_format: 'html',
                output_format: 'invalid'
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(false);
                expect(response.error_message).toBe('Invalid output format. Allowed formats: PDF, DOCX');
                done();
            });
        });

        it('should convert HTML to PDF successfully via gRPC', (done) => {
            const request = {
                data: Buffer.from(sampleHtml),
                input_format: 'html',
                output_format: 'pdf'
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(true);
                expect(response.data).toBeDefined();
                expect(response.data.length).toBeGreaterThan(0);
                expect(response.file_name).toBe('converted_output.pdf');
                expect(response.output_format).toBe('PDF');
                expect(response.conversion_time).toBeGreaterThan(0);
                expect(response.error_message).toBe('');
                done();
            });
        }, 30000);

        it('should convert HTML to DOCX successfully via gRPC', (done) => {
            const request = {
                data: Buffer.from(sampleHtml),
                input_format: 'html',
                output_format: 'docx'
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(true);
                expect(response.data).toBeDefined();
                expect(response.data.length).toBeGreaterThan(0);
                expect(response.file_name).toBe('converted_output.docx');
                expect(response.output_format).toBe('DOCX');
                expect(response.conversion_time).toBeGreaterThan(0);
                expect(response.error_message).toBe('');
                done();
            });
        }, 20000);

        it('should handle case-insensitive format conversion', (done) => {
            const requestPDF = {
                data: Buffer.from(sampleHtml),
                input_format: 'HTML',
                output_format: 'PDF'
            };

            client.convertHtml(requestPDF, (error, responsePDF) => {
                expect(error).toBeNull();
                expect(responsePDF.success).toBe(true);
                expect(responsePDF.output_format).toBe('PDF');

                const requestDocx = {
                    data: Buffer.from(sampleHtml),
                    input_format: 'html',
                    output_format: 'DOCX'
                };

                client.convertHtml(requestDocx, (error, responseDocx) => {
                    expect(error).toBeNull();
                    expect(responseDocx.success).toBe(true);
                    expect(responseDocx.output_format).toBe('DOCX');
                    done();
                });
            });
        }, 30000);

        it('should have consistent response structure', (done) => {
            const request = {
                data: Buffer.from(sampleHtml),
                input_format: 'html',
                output_format: 'pdf'
            };

            client.convertHtml(request, (error, response) => {
                expect(error).toBeNull();
                
                // Check response structure
                expect(response).toHaveProperty('success');
                expect(response).toHaveProperty('data');
                expect(response).toHaveProperty('file_name');
                expect(response).toHaveProperty('output_format');
                expect(response).toHaveProperty('conversion_time');
                expect(response).toHaveProperty('error_message');

                // Check data types
                expect(typeof response.success).toBe('boolean');
                expect(Buffer.isBuffer(response.data)).toBe(true);
                expect(typeof response.file_name).toBe('string');
                expect(typeof response.output_format).toBe('string');
                expect(typeof response.conversion_time).toBe('string'); // gRPC returns as string
                expect(typeof response.error_message).toBe('string');
                
                done();
            });
        }, 30000);
    });

    describe('GenerateDocument gRPC Method', () => {
        it('should return error when link is missing', (done) => {
            const request = {
                link: '',
                data: Buffer.from(JSON.stringify({ test: 'data' }))
            };

            client.generateDocument(request, (error, response) => {
                expect(error).toBeNull();
                expect(response.success).toBe(false);
                expect(response.error_message).toBe('Template link is required.');
                expect(response.pdf_content).toBe('');
                done();
            });
        });
    });
});
