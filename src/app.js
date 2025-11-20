const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Import configurations
const cfg = require('../config/index');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const ValidationMiddleware = require('./middleware/validation');

// Import controllers
const DocumentController = require('./controllers/documentController');

// Import gRPC server
const { startGrpcServer } = require('./grpc/server');

// Import utilities
const FileUtils = require('./utils/fileUtils');
const { charSplit } = require('pdf-lib');




function parsePort(input, fallback = 3000) {
  if (input == null) return fallback;
  const s = String(input).trim();

  // ":3000", "0.0.0.0:3000", "[::]:3000" holatlarini qo'llab-quvvatlaydi
  const m = s.match(/(\d{2,5})$/); // oxiridagi raqamlar (port)
  const n = m ? Number(m[1]) : Number(s.replace(/^:+/, '')); // ":3000" -> "3000"

  return Number.isFinite(n) ? n : fallback;
}



/**
 * Main Application class
 */
class Application {
    constructor() {

        console.log('Initializing Application...', cfg.http_port, cfg.grpc_port);
        this.app = express();
        this.port = parsePort(cfg.http_port, 3000)
        this.documentController = new DocumentController();
        this.grpcServer = null;
        
        this.setupApp();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup Express application
     */
    setupApp() {
        // Ensure temp directory exists
        FileUtils.ensureDirectoryExists('./temp');

        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true
        }));

        // Body parsing middleware
        this.app.use(express.json({ 
            limit: '10mb',
            type: 'application/json'
        }));
        
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: '10mb' 
        }));

        // Request logging in development
        if (process.env.NODE_ENV === 'development') {
            this.app.use((req, res, next) => {
                console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
                next();
            });
        }

        // Setup Swagger documentation
        this.setupSwagger();
    }

    /**
     * Setup Swagger documentation
     */
    setupSwagger() {
        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'Document Generation API',
                    version: '2.0.0',
                    description: 'Clean architecture API for document generation and HTML conversion',
                    contact: {
                        name: 'API Support',
                        email: 'support@udevs.io'
                    },
                },
                servers: [
                    {
                        url: `http://localhost:${this.port}`,
                        description: 'Development server'
                    }
                ],
                components: {
                    schemas: {
                        ConvertHtmlRequest: {
                            type: 'object',
                            required: ['htmlLink', 'outputFormat'],
                            properties: {
                                htmlLink: {
                                    type: 'string',
                                    format: 'uri',
                                    description: 'URL to HTML content',
                                    example: 'https://example.com/document.html'
                                },
                                outputFormat: {
                                    type: 'string',
                                    enum: ['pdf', 'docx'],
                                    description: 'Target conversion format'
                                }
                            }
                        },
                        ConvertHtmlResponse: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                fileUrl: { type: 'string', format: 'uri' },
                                fileName: { type: 'string' },
                                outputFormat: { type: 'string' },
                                conversionTime: { type: 'number', description: 'Time in milliseconds' }
                            }
                        },
                        GenerateDocumentRequest: {
                            type: 'object',
                            required: ['link', 'data'],
                            properties: {
                                link: {
                                    type: 'string',
                                    format: 'uri',
                                    description: 'URL to DOCX template'
                                },
                                data: {
                                    type: 'object',
                                    description: 'Template data object'
                                }
                            }
                        },
                        ErrorResponse: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: false },
                                error: { type: 'string' },
                                code: { type: 'string' }
                            }
                        }
                    }
                }
            },
            apis: ['./src/app.js'], // This file for inline documentation
        };

        const swaggerSpecs = swaggerJsdoc(swaggerOptions);
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: "Document Generation API Docs"
        }));
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        // Health check routes
        this.app.get('/health', this.documentController.healthCheck);
        this.app.get('/status', this.documentController.getServiceStatus);

        // API routes with validation middleware

        /**
         * @swagger
         * /convert-html:
         *   post:
         *     summary: Convert HTML to PDF or DOCX
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/ConvertHtmlRequest'
         *     responses:
         *       200:
         *         description: Successful conversion
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ConvertHtmlResponse'
         *       400:
         *         description: Bad request
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
        this.app.post('/convert-html', 
            ValidationMiddleware.validateContentType(['application/json']),
            ValidationMiddleware.validateRequestSize(),
            ValidationMiddleware.validateHtmlConversion,
            this.documentController.convertHtml
        );

        /**
         * @swagger
         * /generate-doc:
         *   post:
         *     summary: Generate PDF from DOCX template
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/GenerateDocumentRequest'
         *     responses:
         *       200:
         *         description: Generated PDF document
         *         content:
         *           application/pdf:
         *             schema:
         *               type: string
         *               format: binary
         */
        this.app.post('/generate-doc', 
            ValidationMiddleware.validateDocumentGeneration,
            this.documentController.generateDocument
        );

        // Legacy route support for query parameters
        this.app.post('/generate-doc-legacy', 
            ValidationMiddleware.validateDocumentGenerationQuery,
            this.documentController.generateDocument
        );

        /**
         * @swagger
         * /generate-docx:
         *   post:
         *     summary: Generate DOCX from template (without PDF conversion)
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             $ref: '#/components/schemas/GenerateDocumentRequest'
         *     responses:
         *       200:
         *         description: Generated DOCX document
         *         content:
         *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
         *             schema:
         *               type: string
         *               format: binary
         */
        this.app.post('/generate-docx', 
            ValidationMiddleware.validateDocumentGeneration,
            this.documentController.generateDocx
        );

        /**
         * @swagger
         * /convert-html-content:
         *   post:
         *     summary: Convert HTML content directly (not from URL)
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required: [htmlContent, outputFormat]
         *             properties:
         *               htmlContent:
         *                 type: string
         *                 description: HTML content to convert
         *               outputFormat:
         *                 type: string
         *                 enum: [pdf, docx]
         *     responses:
         *       200:
         *         description: Successful conversion
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ConvertHtmlResponse'
         */
        this.app.post('/convert-html-content', 
            ValidationMiddleware.validateContentType(['application/json']),
            this.documentController.convertHtmlContent
        );

        /**
         * @swagger
         * /supported-formats:
         *   get:
         *     summary: Get supported formats and capabilities
         *     responses:
         *       200:
         *         description: List of supported formats
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                 data:
         *                   type: object
         */
        this.app.get('/supported-formats', this.documentController.getSupportedFormats);

        // Root route
        this.app.get('/', (req, res) => {
            res.json({
                service: 'ucode_node_doc_generator_service',
                version: '2.0.0',
                status: 'running',
                documentation: `/api-docs`,
                endpoints: {
                    health: '/health',
                    status: '/status',
                    convertHtml: 'POST /convert-html',
                    generateDoc: 'POST /generate-doc',
                    generateDocx: 'POST /generate-docx',
                    supportedFormats: 'GET /supported-formats'
                },
                grpc: {
                    port: cfg.grpc_port || 50051,
                    services: ['DocumentGenerationService']
                }
            });
        });
    }

    /**
     * Setup error handling middleware
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use(notFoundHandler);

        // Global error handler
        this.app.use(errorHandler);
    }

    /**
     * Start the application
     */
    async start() {
        try {
            // Start HTTP server
            await new Promise((resolve, reject) => {
                const server = this.app.listen(this.port, (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    
                    console.log(`HTTP Server is running on http://localhost:${this.port}`);
                    console.log(`Swagger documentation available at http://localhost:${this.port}/api-docs`);
                    resolve(server);
                });
            });

            // Start gRPC server
            this.grpcServer = await startGrpcServer();
            
            // Setup cleanup
            this.setupGracefulShutdown();
            
            // Schedule periodic temp file cleanup
            this.scheduleCleanup();

            console.log('Application started successfully!');
            
        } catch (error) {
            console.error('Failed to start application:', error.message);
            process.exit(1);
        }
    }

    /**
     * Setup graceful shutdown
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\nReceived ${signal}, shutting down gracefully...`);
            
            try {
                await this.shutdown();
                console.log('Application shutdown completed');
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error.message);
                console.error('Error during shutdown:', error.message);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }

    /**
     * Schedule periodic cleanup tasks
     */
    scheduleCleanup() {
        // Clean up temp files every hour
        setInterval(() => {
            console.log('Running scheduled cleanup...');
            FileUtils.cleanupTempFiles('./temp', 60); // Clean files older than 1 hour
        }, 60 * 60 * 1000); // Every hour
    }

    /**
     * Get Express app instance
     */
    getApp() {
        return this.app;
    }
}

module.exports = Application;
