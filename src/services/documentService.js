const axios = require('axios');
const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const path = require('path');
const CdnService = require('./cdnService');

/**
 * Document Service - handles template-based document generation
 */
class DocumentService {
    constructor() {
        this.cdnService = new CdnService();
        this.tempDir = path.join(__dirname, '../../temp');
    }

    /**
     * Generate PDF document from DOCX template
     * @param {string} templateUrl - URL to DOCX template file
     * @param {Object} templateData - Data to inject into template
     * @returns {Promise<string>} - Base64 encoded PDF content
     */
    async generatePdfFromTemplate(templateUrl, templateData = {}) {
        if (!templateUrl) {
            throw new Error('Template URL is required');
        }

        try {
            // Download template
            const templateBuffer = await this._downloadTemplate(templateUrl);
            
            // Process template with data
            const processedDocx = await this._processTemplate(templateBuffer, templateData);
            
            // Convert to PDF
            const pdfContent = await this._convertDocxToPdf(processedDocx);
            
            return pdfContent;
            
        } catch (error) {
            console.error('Document generation failed:', error.message);
            throw new Error(`Document generation failed: ${error.message}`);
        }
    }

    /**
     * Generate DOCX document from template (without PDF conversion)
     * @param {string} templateUrl - URL to DOCX template file
     * @param {Object} templateData - Data to inject into template
     * @returns {Promise<Buffer>} - DOCX file buffer
     */
    async generateDocxFromTemplate(templateUrl, templateData = {}) {
        if (!templateUrl) {
            throw new Error('Template URL is required');
        }

        try {
            // Download template
            const templateBuffer = await this._downloadTemplate(templateUrl);
            
            // Process template with data
            const processedDocx = await this._processTemplate(templateBuffer, templateData);
            
            return processedDocx;
            
        } catch (error) {
            console.error('DOCX generation failed:', error.message);
            throw new Error(`DOCX generation failed: ${error.message}`);
        }
    }

    /**
     * Download template from URL
     * @private
     */
    async _downloadTemplate(templateUrl) {
        try {
            const response = await axios({
                method: 'get',
                url: templateUrl,
                responseType: 'arraybuffer',
                timeout: 30000 // 30 seconds timeout
            });

            if (response.status !== 200) {
                throw new Error(`Failed to download template. Status: ${response.status}`);
            }

            // Validate content type
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                console.warn('Content type validation failed:', contentType);
                // Don't throw error as some servers might not set correct content-type
            }

            return Buffer.from(response.data);
            
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout while downloading template');
            }
            throw new Error(`Failed to download template: ${error.message}`);
        }
    }

    /**
     * Process DOCX template with data
     * @private
     */
    async _processTemplate(templateBuffer, templateData) {
        try {
            const zip = new PizZip(templateBuffer);
            
            // Use angular expressions parser for advanced templating
            const expressionParser = require('docxtemplater/expressions.js');
            const doc = new Docxtemplater(zip, { 
                parser: expressionParser,
                paragraphLoop: true,
                linebreaks: true
            });

            // Set template data
            doc.setData(templateData);
            
            // Render the document
            doc.render();

            // Generate buffer
            const processedBuffer = doc.getZip().generate({ type: 'nodebuffer' });
            
            return processedBuffer;
            
        } catch (error) {
            if (error.name === 'TemplateError') {
                throw new Error(`Template processing error: ${error.message}`);
            }
            throw new Error(`Failed to process template: ${error.message}`);
        }
    }

    /**
     * Convert DOCX to PDF using external API
     * @private
     */
    async _convertDocxToPdf(docxBuffer) {
        const tempDocxPath = path.join(this.tempDir, `temp_${Date.now()}.docx`);
        
        try {
            // Save DOCX to temporary file
            fs.writeFileSync(tempDocxPath, docxBuffer);
            
            // Read file as base64 for API
            const base64FileData = docxBuffer.toString('base64');

            const payload = {
                Parameters: [
                    {
                        Name: 'File',
                        FileValue: {
                            Name: 'output.docx',
                            Data: base64FileData
                        }
                    },
                    {
                        Name: 'StoreFile',
                        Value: true
                    }
                ]
            };

            // Use random API secret for load balancing
            const convertapi_secret = this.cdnService.getRandomSecret();
            console.log(`Using ConvertAPI secret: ${convertapi_secret}`);
            const convertResponse = await axios.post(
                `https://v2.convertapi.com/convert/docx/to/pdf?Auth=${convertapi_secret}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000 // 60 seconds for conversion
                }
            );

            if (!convertResponse.data?.Files?.[0]?.Url) {
                throw new Error('No PDF URL in conversion response');
            }

            // Download converted PDF
            const pdfResponse = await axios({
                method: 'get',
                url: convertResponse.data.Files[0].Url,
                responseType: 'arraybuffer',
                timeout: 30000
            });

            if (pdfResponse.status !== 200) {
                throw new Error(`Failed to download converted PDF. Status: ${pdfResponse.status}`);
            }

            const pdfBuffer = Buffer.from(pdfResponse.data);
            const pdfBase64 = pdfBuffer.toString('base64');
            
            return pdfBase64;
            
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout during PDF conversion');
            }
            throw new Error(`PDF conversion failed: ${error.message}`);
        } finally {
            // Clean up temporary file
            if (fs.existsSync(tempDocxPath)) {
                fs.unlinkSync(tempDocxPath);
            }
        }
    }

    /**
     * Validate template data structure
     * @param {Object} templateData - Data to validate
     * @returns {boolean} - Validation result
     */
    validateTemplateData(templateData) {
        if (!templateData || typeof templateData !== 'object') {
            return false;
        }
        
        // Add specific validation rules based on your template requirements
        return true;
    }

    /**
     * Get supported template formats
     * @returns {Array} - List of supported formats
     */
    getSupportedFormats() {
        return ['docx'];
    }
}

module.exports = DocumentService;
