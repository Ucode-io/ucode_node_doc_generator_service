const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Import the app
const app = require('../index');

describe('HTML Conversion API', () => {
    // Create a simple test HTML file for testing
    const testHtmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test HTML</title>
            <style>
                body { font-family: Arial, sans-serif; }
                h1 { color: blue; }
                p { margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>Test Document</h1>
            <p>Bu test uchun yaratilgan HTML fayl.</p>
            <p>HTML dan PDF va DOCX ga konvertatsiya test qilinmoqda.</p>
            <ul>
                <li>Birinchi element</li>
                <li>Ikkinchi element</li>
                <li>Uchinchi element</li>
            </ul>
        </body>
        </html>
    `;

    let testHtmlUrl;

    beforeAll(async () => {
        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Create a test HTML file
        const testHtmlPath = path.join(tempDir, 'test.html');
        fs.writeFileSync(testHtmlPath, testHtmlContent);
        
        // For testing purposes, we'll use a simple HTTP server to serve the HTML file
        // In real tests, you might want to use a mock server or a real URL
        testHtmlUrl = 'https://httpbin.org/html'; // Using httpbin.org as a test HTML source
    });

    afterAll(() => {
        // Clean up any test files if needed
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

    describe('POST /convert-html - Input Validation', () => {
        it('should return 400 when htmlLink is missing', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ outputFormat: 'pdf' })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                error: 'HTML link is required.'
            });
        });

        it('should return 400 when outputFormat is missing', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ htmlLink: testHtmlUrl })
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                error: 'Output format is required.'
            });
        });

        it('should return 400 when outputFormat is invalid', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'invalid-format'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid output format. Allowed formats: pdf, docx');
        });

        it('should return 400 when HTML link is invalid', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: 'invalid-url',
                    outputFormat: 'pdf'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to fetch HTML content.');
        });
    });

    describe('POST /convert-html - Format Enum Validation', () => {
        it('should accept "pdf" format (lowercase)', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'pdf'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.outputFormat).toBe('pdf');
        }, 30000);

        it('should accept "PDF" format (uppercase)', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'PDF'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.outputFormat).toBe('pdf'); // Should be normalized to lowercase
        }, 30000);

        it('should accept "docx" format (lowercase)', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'docx'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.outputFormat).toBe('docx');
        }, 20000);

        it('should accept "DOCX" format (uppercase)', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'DOCX'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.outputFormat).toBe('docx'); // Should be normalized to lowercase
        }, 20000);

        it('should reject unsupported formats', async () => {
            const unsupportedFormats = ['txt', 'jpg', 'png', 'excel', 'xls', 'ppt'];
            
            for (const format of unsupportedFormats) {
                const response = await request(app)
                    .post('/convert-html')
                    .send({ 
                        htmlLink: testHtmlUrl,
                        outputFormat: format
                    })
                    .expect(400);

                expect(response.body.success).toBe(false);
                expect(response.body.error).toBe('Invalid output format. Allowed formats: pdf, docx');
            }
        });
    });

    describe('POST /convert-html - Successful Conversions', () => {
        it('should convert HTML to PDF successfully', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'pdf'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.fileUrl).toBeDefined();
            expect(response.body.fileName).toBe('converted_output.pdf');
            expect(response.body.outputFormat).toBe('pdf');
            expect(response.body.conversionTime).toBeGreaterThan(0);
            expect(typeof response.body.fileUrl).toBe('string');
        }, 30000);

        it('should convert HTML to DOCX successfully', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'docx'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.fileUrl).toBeDefined();
            expect(response.body.fileName).toBe('converted_output.docx');
            expect(response.body.outputFormat).toBe('docx');
            expect(response.body.conversionTime).toBeGreaterThan(0);
            expect(typeof response.body.fileUrl).toBe('string');
        }, 20000);
    });

    describe('POST /convert-html - Response Format Validation', () => {
        it('should have consistent success response format for PDF conversion', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'pdf'
                })
                .expect(200);

            // Check response structure
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('fileUrl');
            expect(response.body).toHaveProperty('fileName');
            expect(response.body).toHaveProperty('outputFormat');
            expect(response.body).toHaveProperty('conversionTime');

            // Check data types
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.fileUrl).toBe('string');
            expect(typeof response.body.fileName).toBe('string');
            expect(typeof response.body.outputFormat).toBe('string');
            expect(typeof response.body.conversionTime).toBe('number');

            // Check specific values
            expect(response.body.success).toBe(true);
            expect(response.body.outputFormat).toBe('pdf');
        }, 30000);

        it('should have consistent success response format for DOCX conversion', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: testHtmlUrl,
                    outputFormat: 'docx'
                })
                .expect(200);

            // Check response structure
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('fileUrl');
            expect(response.body).toHaveProperty('fileName');
            expect(response.body).toHaveProperty('outputFormat');
            expect(response.body).toHaveProperty('conversionTime');

            // Check data types
            expect(typeof response.body.success).toBe('boolean');
            expect(typeof response.body.fileUrl).toBe('string');
            expect(typeof response.body.fileName).toBe('string');
            expect(typeof response.body.outputFormat).toBe('string');
            expect(typeof response.body.conversionTime).toBe('number');

            // Check specific values
            expect(response.body.success).toBe(true);
            expect(response.body.outputFormat).toBe('docx');
        }, 20000);
    });

    describe('POST /convert-html - Error Handling', () => {
        it('should handle server errors gracefully in PDF conversion', async () => {
            // Test with a URL that will cause a server error
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: 'https://httpbin.org/status/500',
                    outputFormat: 'pdf'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to fetch HTML content.');
        });

        it('should handle server errors gracefully in DOCX conversion', async () => {
            // Test with a URL that will cause a server error
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: 'https://httpbin.org/status/500',
                    outputFormat: 'docx'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to fetch HTML content.');
        });

        it('should include error details in response when conversion fails', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({ 
                    htmlLink: 'invalid-url',
                    outputFormat: 'pdf'
                })
                .expect(400);

            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('error');
            expect(response.body.success).toBe(false);
        });
    });
});
