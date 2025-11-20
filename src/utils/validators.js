/**
 * Input validation utilities
 */
class Validators {
    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - Validation result
     */
    static isValidUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate HTTP/HTTPS URL
     * @param {string} url - URL to validate
     * @returns {boolean} - Validation result
     */
    static isValidHttpUrl(url) {
        if (!this.isValidUrl(url)) {
            return false;
        }

        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }

    /**
     * Validate output format
     * @param {string} format - Format to validate
     * @param {Array} allowedFormats - Array of allowed formats
     * @returns {boolean} - Validation result
     */
    static isValidOutputFormat(format, allowedFormats = ['pdf', 'docx']) {
        if (!format || typeof format !== 'string') {
            return false;
        }

        return allowedFormats.includes(format.toLowerCase());
    }

    /**
     * Validate template data object
     * @param {*} data - Data to validate
     * @returns {boolean} - Validation result
     */
    static isValidTemplateData(data) {
        return data !== null && typeof data === 'object';
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - Validation result
     */
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Sanitize filename to remove dangerous characters
     * @param {string} filename - Filename to sanitize
     * @returns {string} - Sanitized filename
     */
    static sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'untitled';
        }

        // Remove or replace dangerous characters
        return filename
            .replace(/[<>:"/\\|?*]/g, '_') // Replace dangerous chars with underscore
            .replace(/\s+/g, '_') // Replace spaces with underscore
            .toLowerCase()
            .substring(0, 100); // Limit length
    }

    /**
     * Validate and sanitize user input
     * @param {string} input - User input
     * @param {number} maxLength - Maximum allowed length
     * @returns {string|null} - Sanitized input or null if invalid
     */
    static sanitizeUserInput(input, maxLength = 1000) {
        if (!input || typeof input !== 'string') {
            return null;
        }

        // Trim whitespace
        let sanitized = input.trim();

        // Check length
        if (sanitized.length > maxLength) {
            return null;
        }

        // Basic XSS prevention
        sanitized = sanitized
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, ''); // Remove HTML tags

        return sanitized;
    }

    /**
     * Validate port number
     * @param {*} port - Port to validate
     * @returns {boolean} - Validation result
     */
    static isValidPort(port) {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
    }

    /**
     * Validate API key format (basic validation)
     * @param {string} apiKey - API key to validate
     * @returns {boolean} - Validation result
     */
    static isValidApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        // Basic validation - adjust based on your API key format
        return apiKey.length >= 10 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
    }

    /**
     * Check if string contains only safe characters for file operations
     * @param {string} str - String to check
     * @returns {boolean} - Safety check result
     */
    static isSafeString(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }

        // Allow alphanumeric, spaces, hyphens, underscores, dots
        const safePattern = /^[a-zA-Z0-9\s\-_.]+$/;
        return safePattern.test(str);
    }

    /**
     * Validate request body structure for HTML conversion
     * @param {Object} body - Request body
     * @returns {Object} - Validation result with errors
     */
    static validateHtmlConversionRequest(body) {
        const errors = [];

        if (!body) {
            errors.push('Request body is required');
            return { valid: false, errors };
        }

        if (!body.htmlLink) {
            errors.push('htmlLink is required');
        } else if (!this.isValidHttpUrl(body.htmlLink)) {
            errors.push('htmlLink must be a valid HTTP/HTTPS URL');
        }

        if (!body.outputFormat) {
            errors.push('outputFormat is required');
        } else if (!this.isValidOutputFormat(body.outputFormat)) {
            errors.push('outputFormat must be either "pdf" or "docx"');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate request body structure for document generation
     * @param {Object} body - Request body
     * @returns {Object} - Validation result with errors
     */
    static validateDocumentGenerationRequest(body) {
        const errors = [];

        if (!body) {
            errors.push('Request body is required');
            return { valid: false, errors };
        }

        if (!body.link) {
            errors.push('link is required');
        } else if (!this.isValidHttpUrl(body.link)) {
            errors.push('link must be a valid HTTP/HTTPS URL');
        }

        if (!body.data) {
            errors.push('data is required');
        } else if (!this.isValidTemplateData(body.data)) {
            errors.push('data must be a valid object');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = Validators;
