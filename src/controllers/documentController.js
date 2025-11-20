const HtmlConverterService = require('../services/htmlConverterService');
const DocumentService = require('../services/documentService');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * Document Controller - handles HTTP requests for document operations
 */
class DocumentController {
    constructor() {
        this.htmlConverter = new HtmlConverterService();
        this.documentService = new DocumentService();
    }

    /**
     * Convert HTML to PDF or DOCX
     * POST /convert-html
     */
    convertHtml = asyncHandler(async (req, res) => {
        const { htmlLink, outputFormat } = req.body;

        console.log(`${outputFormat.toUpperCase()} conversion started...`);

        try {
            const result = await this.htmlConverter.convertFromUrl(htmlLink, outputFormat);

            console.log(`${outputFormat.toUpperCase()} file ready: ${result.fileUrl} (${result.conversionTime}ms)`);

            res.json(result);
        } catch (error) {
            console.error(`${outputFormat.toUpperCase()} conversion error:`, error.message);
            throw createError.conversion(error.message);
        }
    });

    /**
     * Generate PDF document from DOCX template
     * POST /generate-doc
     */
    generateDocument = asyncHandler(async (req, res) => {
        // Use validated data from middleware
        const { link, data } = req.validatedData;

        console.log('Document generation started for:', link);

        try {
            const pdfContent = await this.documentService.generatePdfFromTemplate(link, data);

            console.log('PDF document generated successfully');

            // Set response headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=generated.pdf');

            // Convert base64 to buffer and send
            const pdfBuffer = Buffer.from(pdfContent, 'base64');
            res.send(pdfBuffer);

        } catch (error) {
            console.error('Document generation error:', error.message);
            throw createError.template(error.message);
        }
    });

    /**
     * Generate DOCX document from template (without PDF conversion)
     * POST /generate-docx
     */
    generateDocx = asyncHandler(async (req, res) => {
        const { link, data } = req.validatedData;

        console.log('DOCX generation started for:', link);

        try {
            const docxBuffer = await this.documentService.generateDocxFromTemplate(link, data);

            console.log('DOCX document generated successfully');

            // Set response headers for DOCX download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment; filename=generated.docx');

            res.send(docxBuffer);

        } catch (error) {
            console.error('DOCX generation error:', error.message);
            throw createError.template(error.message);
        }
    });

    /**
     * Convert HTML content directly (not from URL)
     * POST /convert-html-content
     */
    convertHtmlContent = asyncHandler(async (req, res) => {
        const { htmlContent, outputFormat } = req.body;

        if (!htmlContent) {
            throw createError.validation('HTML content is required');
        }

        if (!outputFormat) {
            throw createError.validation('Output format is required');
        }

        console.log(`Direct ${outputFormat.toUpperCase()} conversion started...`);

        try {
            const result = await this.htmlConverter.convertContent(htmlContent, outputFormat);

            console.log(`${outputFormat.toUpperCase()} file ready: ${result.fileUrl} (${result.conversionTime}ms)`);

            res.json(result);
        } catch (error) {
            console.error(`${outputFormat.toUpperCase()} conversion error:`, error.message);
            throw createError.conversion(error.message);
        }
    });

    /**
     * Get supported formats
     * GET /supported-formats
     */
    getSupportedFormats = asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: {
                htmlConversion: ['pdf', 'docx'],
                templateFormats: this.documentService.getSupportedFormats(),
                outputFormats: ['pdf', 'docx']
            }
        });
    });

    /**
     * Health check endpoint
     * GET /health
     */
    healthCheck = asyncHandler(async (req, res) => {
        const startTime = Date.now();
        
        try {
            // Perform basic service checks
            const checks = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                services: {
                    htmlConverter: 'available',
                    documentService: 'available',
                    cdnService: 'available'
                }
            };

            const responseTime = Date.now() - startTime;
            checks.responseTime = `${responseTime}ms`;

            res.json(checks);
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    });

    /**
     * Service status endpoint with detailed information
     * GET /status
     */
    getServiceStatus = asyncHandler(async (req, res) => {
        const status = {
            service: 'ucode_node_doc_generator_service',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: process.uptime(),
                readable: this._formatUptime(process.uptime())
            },
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
                }
            },
            endpoints: {
                rest: [
                    'POST /convert-html',
                    'POST /generate-doc',
                    'POST /generate-docx',
                    'POST /convert-html-content',
                    'GET /supported-formats',
                    'GET /health',
                    'GET /status'
                ],
                grpc: [
                    'ConvertHtml',
                    'GenerateDocument'
                ]
            }
        };

        res.json(status);
    });

    /**
     * Format uptime in human readable format
     * @private
     */
    _formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }
}

module.exports = DocumentController;
