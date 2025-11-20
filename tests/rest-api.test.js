const request = require('supertest');
const Application = require('../src/app');

describe('REST API Integration Tests', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Create application instance
        const application = new Application();
        app = application.getApp();
    });

    afterAll(async () => {
        // Clean up
        if (server) {
            server.close();
        }
    });

    describe('Health Endpoints', () => {
        test('GET /health should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('healthy');
        });

        test('GET /status should return service status', async () => {
            const response = await request(app)
                .get('/status')
                .expect(200);

            expect(response.body).toHaveProperty('service');
            expect(response.body.service).toBe('ucode_node_doc_generator_service');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
        });

        test('GET /supported-formats should return supported formats', async () => {
            const response = await request(app)
                .get('/supported-formats')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('htmlConversion');
            expect(response.body.data.htmlConversion).toContain('pdf');
            expect(response.body.data.htmlConversion).toContain('docx');
        });
    });

    describe('HTML Conversion Endpoints', () => {
        test('POST /convert-html should validate required fields', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });

        test('POST /convert-html should validate htmlLink format', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({
                    htmlLink: 'invalid-url',
                    outputFormat: 'pdf'
                })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('valid HTTP/HTTPS URL');
        });

        test('POST /convert-html should validate outputFormat', async () => {
            const response = await request(app)
                .post('/convert-html')
                .send({
                    htmlLink: 'https://example.com',
                    outputFormat: 'invalid'
                })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('either "pdf" or "docx"');
        });

        test('POST /convert-html-content should validate htmlContent', async () => {
            const response = await request(app)
                .post('/convert-html-content')
                .send({
                    outputFormat: 'pdf'
                })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('HTML content is required');
        });
    });

    describe('Document Generation Endpoints', () => {
        test('POST /generate-doc should validate required fields', async () => {
            const response = await request(app)
                .post('/generate-doc')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });

        test('POST /generate-doc should validate link format', async () => {
            const response = await request(app)
                .post('/generate-doc')
                .send({
                    link: 'invalid-url',
                    data: { test: 'data' }
                })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('valid HTTP/HTTPS URL');
        });

        test('POST /generate-docx should validate required fields', async () => {
            const response = await request(app)
                .post('/generate-docx')
                .send({
                    link: 'https://example.com/template.docx'
                })
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('data is required');
        });
    });

    describe('Error Handling', () => {
        test('GET /nonexistent should return 404', async () => {
            const response = await request(app)
                .get('/nonexistent')
                .expect(404);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('not found');
        });

        test('POST with invalid Content-Type should return 400', async () => {
            const response = await request(app)
                .post('/convert-html')
                .set('Content-Type', 'text/plain')
                .send('invalid data')
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
        });
    });

    describe('Root Endpoint', () => {
        test('GET / should return service information', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body).toHaveProperty('service');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body).toHaveProperty('grpc');
        });
    });
});
