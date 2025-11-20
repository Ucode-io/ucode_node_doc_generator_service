/**
 * Application-specific error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error types for consistent error handling
 */
const ErrorTypes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONVERSION_ERROR: 'CONVERSION_ERROR',
    TEMPLATE_ERROR: 'TEMPLATE_ERROR',
    UPLOAD_ERROR: 'UPLOAD_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Create specific error types
 */
const createError = {
    validation: (message) => new AppError(message, 400, ErrorTypes.VALIDATION_ERROR),
    notFound: (message) => new AppError(message, 404, ErrorTypes.NOT_FOUND),
    conversion: (message) => new AppError(message, 500, ErrorTypes.CONVERSION_ERROR),
    template: (message) => new AppError(message, 500, ErrorTypes.TEMPLATE_ERROR),
    upload: (message) => new AppError(message, 500, ErrorTypes.UPLOAD_ERROR),
    network: (message) => new AppError(message, 500, ErrorTypes.NETWORK_ERROR),
    timeout: (message) => new AppError(message, 408, ErrorTypes.TIMEOUT_ERROR),
    internal: (message) => new AppError(message, 500, ErrorTypes.INTERNAL_ERROR)
};

/**
 * Express error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    // Default to 500 server error
    let error = { ...err };
    error.message = err.message;

    // Log error
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Invalid resource ID';
        error = createError.validation(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = createError.validation(message);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = createError.validation(message);
    }

    // Handle specific known errors
    if (err.message.includes('timeout')) {
        error = createError.timeout('Request timeout - operation took too long');
    }

    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
        error = createError.network('Network connection failed');
    }

    if (err.message.includes('Invalid URL')) {
        error = createError.validation('Invalid URL provided');
    }

    // Prepare response
    const response = {
        success: false,
        error: error.message || 'Internal Server Error',
        code: error.code || ErrorTypes.INTERNAL_ERROR
    };

    // Add additional details in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.details = err;
    }

    res.status(error.statusCode || 500).json(response);
};

/**
 * Handle async errors in Express routes
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
    const error = createError.notFound(`Route ${req.originalUrl} not found`);
    next(error);
};

module.exports = {
    AppError,
    ErrorTypes,
    createError,
    errorHandler,
    asyncHandler,
    notFoundHandler
};
