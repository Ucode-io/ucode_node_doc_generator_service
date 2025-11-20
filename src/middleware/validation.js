const { createError } = require('./errorHandler');
const Validators = require('../utils/validators');

/**
 * Request validation middleware
 */
class ValidationMiddleware {
    /**
     * Validate HTML conversion request
     */
    static validateHtmlConversion(req, res, next) {
        const validation = Validators.validateHtmlConversionRequest(req.body);
        
        if (!validation.valid) {
            return next(createError.validation(validation.errors.join('; ')));
        }
        
        next();
    }

    /**
     * Validate document generation request
     */
    static validateDocumentGeneration(req, res, next) {
        // Handle both body and query parameters for backward compatibility
        const requestData = {
            link: req.body.link || req.query.link,
            data: req.body.data || req.query.data
        };

        // If data is a string, try to parse it as JSON
        if (typeof requestData.data === 'string') {
            try {
                requestData.data = JSON.parse(requestData.data);
            } catch (error) {
                return next(createError.validation('Invalid JSON format in data parameter'));
            }
        }

        const validation = Validators.validateDocumentGenerationRequest(requestData);
        
        if (!validation.valid) {
            return next(createError.validation(validation.errors.join('; ')));
        }

        // Attach cleaned data to request for use in controller
        req.validatedData = requestData;
        next();
    }

    /**
     * Validate query parameters for document generation (legacy support)
     */
    static validateDocumentGenerationQuery(req, res, next) {
        const { link, data } = req.query;

        if (!link) {
            return next(createError.validation('link parameter is required'));
        }

        if (!Validators.isValidHttpUrl(link)) {
            return next(createError.validation('link must be a valid HTTP/HTTPS URL'));
        }

        if (!data) {
            return next(createError.validation('data parameter is required'));
        }

        // Try to parse data as JSON
        let parsedData;
        try {
            parsedData = JSON.parse(data);
        } catch (error) {
            return next(createError.validation('data must be valid JSON'));
        }

        if (!Validators.isValidTemplateData(parsedData)) {
            return next(createError.validation('data must be a valid object'));
        }

        // Attach validated data to request
        req.validatedData = {
            link,
            data: parsedData
        };

        next();
    }

    /**
     * Validate file upload parameters
     */
    static validateFileUpload(req, res, next) {
        if (!req.file && !req.files) {
            return next(createError.validation('No file uploaded'));
        }

        // Add file validation logic here
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/html'
        ];

        const file = req.file || (req.files && req.files[0]);
        
        if (file && !allowedMimeTypes.includes(file.mimetype)) {
            return next(createError.validation('Invalid file type. Only DOCX and HTML files are allowed'));
        }

        next();
    }

    /**
     * Validate URL parameter
     */
    static validateUrlParam(paramName) {
        return (req, res, next) => {
            const url = req.params[paramName] || req.query[paramName] || req.body[paramName];
            
            if (!url) {
                return next(createError.validation(`${paramName} is required`));
            }

            if (!Validators.isValidHttpUrl(url)) {
                return next(createError.validation(`${paramName} must be a valid HTTP/HTTPS URL`));
            }

            next();
        };
    }

    /**
     * Validate output format parameter
     */
    static validateOutputFormat(req, res, next) {
        const format = req.body.outputFormat || req.query.outputFormat || req.params.format;
        
        if (!format) {
            return next(createError.validation('outputFormat is required'));
        }

        if (!Validators.isValidOutputFormat(format)) {
            return next(createError.validation('outputFormat must be either "pdf" or "docx"'));
        }

        // Normalize format to lowercase
        req.outputFormat = format.toLowerCase();
        next();
    }

    /**
     * Rate limiting validation (basic implementation)
     */
    static rateLimitValidation(maxRequests = 100, windowMs = 15 * 60 * 1000) {
        const requests = new Map();

        return (req, res, next) => {
            const clientId = req.ip || 'unknown';
            const now = Date.now();
            
            // Clean old entries
            for (const [key, value] of requests.entries()) {
                if (now - value.timestamp > windowMs) {
                    requests.delete(key);
                }
            }

            // Check current client
            const clientRequests = requests.get(clientId) || { count: 0, timestamp: now };
            
            if (clientRequests.count >= maxRequests && now - clientRequests.timestamp < windowMs) {
                return next(createError.validation('Too many requests. Please try again later.'));
            }

            // Update counter
            if (now - clientRequests.timestamp > windowMs) {
                clientRequests.count = 1;
                clientRequests.timestamp = now;
            } else {
                clientRequests.count++;
            }

            requests.set(clientId, clientRequests);
            next();
        };
    }

    /**
     * Content-Type validation
     */
    static validateContentType(expectedTypes = ['application/json']) {
        return (req, res, next) => {
            if (req.method === 'GET') {
                return next(); // Skip for GET requests
            }

            const contentType = req.headers['content-type'];
            
            if (!contentType) {
                return next(createError.validation('Content-Type header is required'));
            }

            const isValidType = expectedTypes.some(type => 
                contentType.includes(type)
            );

            if (!isValidType) {
                return next(createError.validation(
                    `Invalid Content-Type. Expected: ${expectedTypes.join(' or ')}`
                ));
            }

            next();
        };
    }

    /**
     * Request size validation
     */
    static validateRequestSize(maxSizeBytes = 10 * 1024 * 1024) { // 10MB default
        return (req, res, next) => {
            const contentLength = parseInt(req.headers['content-length'] || '0');
            
            if (contentLength > maxSizeBytes) {
                return next(createError.validation(
                    `Request too large. Maximum size: ${maxSizeBytes / 1024 / 1024}MB`
                ));
            }

            next();
        };
    }
}

module.exports = ValidationMiddleware;
