#!/usr/bin/env node

/**
    try {
        console.log('Starting ucode_node_doc_generator_service...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        
        const app = new App();
        await app.start();
        
    } catch (error) {
        console.error('Failed to start server:', error.message);Architecture Document Generation Service
 * Entry point for the application
 */

const Application = require('./src/app');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

// Start the application
async function startServer() {
    try {
        console.log('Starting ucode_node_doc_generator_service...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        
        const app = new Application();
        await app.start();
        
    } catch (error) {
        console.error('Failed to start server:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Start the server
startServer();
