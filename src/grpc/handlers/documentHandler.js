const HtmlConverterService = require('../../services/htmlConverterService');
const DocumentService = require('../../services/documentService');

/**
 * gRPC Document Handler - handles gRPC requests for document operations
 */
class DocumentHandler {
    constructor() {
        this.htmlConverter = new HtmlConverterService();
        this.documentService = new DocumentService();
    }

    /**
     * Handle ConvertHtml gRPC call
     */
    ConvertHtml = async (call, callback) => {
        const { data, input_format, output_format } = call.request;

        console.log(`gRPC ${output_format} conversion started with input format: ${input_format}`);

        try {
            // Validate inputs
            if (!data || data.length === 0) {
                return callback(null, {
                    success: false,
                    data: Buffer.alloc(0),
                    file_name: '',
                    output_format: output_format || 'PDF',
                    conversion_time: 0,
                    error_message: 'HTML data is required.'
                });
            }

            if (!input_format) {
                return callback(null, {
                    success: false,
                    data: Buffer.alloc(0),
                    file_name: '',
                    output_format: output_format || 'PDF',
                    conversion_time: 0,
                    error_message: 'Input format is required.'
                });
            }

            if (!output_format) {
                return callback(null, {
                    success: false,
                    data: Buffer.alloc(0),
                    file_name: '',
                    output_format: 'PDF',
                    conversion_time: 0,
                    error_message: 'Output format is required.'
                });
            }

            // Validate input format (should be HTML)
            if (input_format.toLowerCase() !== 'html') {
                return callback(null, {
                    success: false,
                    data: Buffer.alloc(0),
                    file_name: '',
                    output_format: output_format,
                    conversion_time: 0,
                    error_message: 'Only HTML input format is supported.'
                });
            }

            // Normalize output format
            let formatString = 'pdf';
            const format = output_format.toLowerCase();
            
            if (format === 'pdf') {
                formatString = 'pdf';
            } else if (format === 'docx' || format === 'doc') {
                formatString = 'docx';
            } else {
                return callback(null, {
                    success: false,
                    data: Buffer.alloc(0),
                    file_name: '',
                    output_format: output_format,
                    conversion_time: 0,
                    error_message: 'Invalid output format. Allowed formats: PDF, DOCX'
                });
            }

            // Convert bytes to string (assuming UTF-8 encoding)
            const htmlContent = data.toString('utf8');

            // Perform conversion
            const result = await this.htmlConverter.convertContentToBytes(htmlContent, formatString);

            console.log(`gRPC ${formatString.toUpperCase()} conversion completed, file size: ${result.data.length} bytes`);

            callback(null, {
                success: true,
                data: result.data,
                file_name: result.fileName,
                output_format: formatString.toUpperCase(),
                conversion_time: result.conversionTime,
                error_message: ''
            });

        } catch (error) {
            console.error(`gRPC ${output_format} conversion error:`, error.message);
            
            callback(null, {
                success: false,
                data: Buffer.alloc(0),
                file_name: '',
                output_format: output_format || 'PDF',
                conversion_time: 0,
                error_message: `Error during ${output_format} conversion: ${error.message}`
            });
        }
    };

    /**
     * Handle GenerateDocument gRPC call
     */
    generateDocument = async (call, callback) => {
        const { link, data } = call.request;

        console.log('gRPC document generation started for:', link);

        try {
            // Validate inputs - same validation as HTTP API
            if (!link) {
                return callback(null, {
                    success: false,
                    pdf_content: '',
                    error_message: 'Template link is required.'
                });
            }

            // Validate URL format - same as HTTP API validation
            try {
                new URL(link);
                const urlObj = new URL(link);
                if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                    return callback(null, {
                        success: false,
                        pdf_content: '',
                        error_message: 'Template link must be a valid HTTP/HTTPS URL.'
                    });
                }
            } catch (urlError) {
                return callback(null, {
                    success: false,
                    pdf_content: '',
                    error_message: 'Template link must be a valid HTTP/HTTPS URL.'
                });
            }

            // Parse template data from gRPC Struct
            let templateData = {};
            if (data && data.fields) {
                templateData = this._structToObject(data);
            } else if (data) {
                // If it's already an object (backward compatibility)
                templateData = data;
            }

            // Validate template data - same as HTTP API
            if (!templateData || typeof templateData !== 'object') {
                return callback(null, {
                    success: false,
                    pdf_content: '',
                    error_message: 'Template data must be a valid object.'
                });
            }

            console.log('gRPC template data:', templateData);

            // Generate PDF document using the same service as HTTP API
            const pdfContent = await this.documentService.generatePdfFromTemplate(link, templateData);

            console.log('gRPC PDF document generated successfully');

            // Convert base64 to buffer for gRPC response
            const pdfBuffer = Buffer.from(pdfContent, 'base64');

            callback(null, {
                success: true,
                pdf_content: pdfBuffer,
                error_message: ''
            });

        } catch (error) {
            console.error('gRPC document generation error:', error.message);
            
            callback(null, {
                success: false,
                pdf_content: '',
                error_message: `Document generation failed: ${error.message}`
            });
        }
    };

    /**
     * Convert gRPC Struct to JavaScript object
     * @private
     */
    _structToObject(struct) {
        if (!struct || !struct.fields) {
            return {};
        }

        const result = {};
        
        for (const [key, value] of Object.entries(struct.fields)) {
            result[key] = this._convertValue(value);
        }

        return result;
    }

    /**
     * Convert gRPC Value to JavaScript value
     * @private
     */
    _convertValue(value) {
        if (!value) return null;

        if (value.nullValue !== undefined) {
            return null;
        }

        if (value.numberValue !== undefined) {
            return value.numberValue;
        }

        if (value.stringValue !== undefined) {
            return value.stringValue;
        }

        if (value.boolValue !== undefined) {
            return value.boolValue;
        }

        if (value.structValue !== undefined) {
            return this._structToObject(value.structValue);
        }

        if (value.listValue !== undefined) {
            return value.listValue.values.map(v => this._convertValue(v));
        }

        return null;
    }

    /**
     * Get service methods for gRPC server registration
     */
    getServiceMethods() {
        return {
            ConvertHtml: this.ConvertHtml,
            GenerateDocument: this.generateDocument
        };
    }

    /**
     * Validate gRPC request structure
     * @private
     */
    _validateRequest(request, requiredFields) {
        const missing = [];
        
        for (const field of requiredFields) {
            if (!request[field]) {
                missing.push(field);
            }
        }

        return {
            valid: missing.length === 0,
            missing
        };
    }

    /**
     * Create error response for gRPC
     * @private
     */
    _createErrorResponse(errorMessage, responseTemplate = {}) {
        return {
            success: false,
            error_message: errorMessage,
            ...responseTemplate
        };
    }

    /**
     * Create success response for gRPC
     * @private
     */
    _createSuccessResponse(data, responseTemplate = {}) {
        return {
            success: true,
            error_message: '',
            ...responseTemplate,
            ...data
        };
    }

    /**
     * Log gRPC request for debugging
     * @private
     */
    _logRequest(methodName, request) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`gRPC ${methodName} request:`, JSON.stringify(request, null, 2));
        }
    }

    /**
     * Log gRPC response for debugging
     * @private
     */
    _logResponse(methodName, response) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`gRPC ${methodName} response:`, JSON.stringify(response, null, 2));
        }
    }
}

module.exports = DocumentHandler;
