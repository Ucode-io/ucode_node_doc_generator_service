const axios = require('axios');
const fs = require('fs');
const { convertapi_secrets } = require('../../config/constants');

/**
 * CDN Service - handles file uploads to external CDN
 */
class CdnService {
    constructor() {
        this.secrets = convertapi_secrets;
    }

    /**
     * Upload file to CDN and return public URL
     * @param {string} filePath - Local file path to upload
     * @param {string} fileName - Name for the uploaded file
     * @returns {Promise<string>} - Public URL of uploaded file
     */
    async uploadFile(filePath, fileName) {
        try {
            // Read file as base64
            const fileData = fs.readFileSync(filePath);
            const base64FileData = fileData.toString('base64');

            const payload = {
                Parameters: [
                    {
                        Name: 'File',
                        FileValue: {
                            Name: fileName,
                            Data: base64FileData
                        }
                    },
                    {
                        Name: 'StoreFile',
                        Value: true
                    }
                ]
            };

            // Use the first convert API secret for file storage
            const convertapi_secret = this.secrets[0];
            
            const response = await axios.post(
                `https://v2.convertapi.com/convert/pdf/to/pdf?Secret=${convertapi_secret}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data && response.data.Files && response.data.Files[0]) {
                return response.data.Files[0].Url;
            }
            
            throw new Error('Failed to upload to CDN - no file URL in response');
        } catch (error) {
            console.error('Error uploading to CDN:', error.message);
            throw new Error(`CDN upload failed: ${error.message}`);
        }
    }

    /**
     * Upload a file to CDN without running it through a converter.
     * PDF/DOCX uploadFile() dagi konvertor endpointidan foydalanadi, PNG kabi
     * formatlar esa faqat saqlanishi kerak - shu yo'l ular uchun ishlatiladi.
     * @param {string} filePath - Local file path to upload
     * @param {string} fileName - Name for the uploaded file
     * @returns {Promise<string>} - Public URL of uploaded file
     */
    async uploadRawFile(filePath, fileName) {
        try {
            const fileData = fs.readFileSync(filePath);

            // Use the first convert API secret for file storage
            const convertapi_secret = this.secrets[0];

            const response = await axios.post(
                `https://v2.convertapi.com/upload?Secret=${convertapi_secret}`,
                fileData,
                {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `inline; filename="${fileName}"`,
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                }
            );

            if (response.data && response.data.Url) {
                return response.data.Url;
            }

            throw new Error('Failed to upload to CDN - no file URL in response');
        } catch (error) {
            console.error('Error uploading raw file to CDN:', error.message);
            throw new Error(`CDN upload failed: ${error.message}`);
        }
    }

    /**
     * Get a random ConvertAPI secret for load balancing
     * @returns {string} - Random API secret
     */
    getRandomSecret() {
        const randomIndex = Math.floor(Math.random() * this.secrets.length);
        return this.secrets[randomIndex];
    }
}

module.exports = CdnService;
