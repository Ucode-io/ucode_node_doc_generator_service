const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const DocumentHandler = require('./handlers/documentHandler');
const cfg = require('../../config/index');

/**
 * gRPC Server setup and management
 */
class GrpcServer {
    constructor() {
        this.server = null;
        this.documentHandler = new DocumentHandler();
        this.isStarted = false;
    }

    /**
     * Initialize and start the gRPC server
     */
    async start() {
        try {
            // Load proto file
            const PROTO_PATH = path.join(__dirname, '../../protos', 'doc_generator_service', 'doc_generator_service.proto');

            if (!require('fs').existsSync(PROTO_PATH)) {
                throw new Error(`Proto file not found: ${PROTO_PATH}`);
            }

            const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true
            });

            const documentServiceProto = grpc.loadPackageDefinition(packageDefinition).doc_generator_service;

            // Create server instance
            this.server = new grpc.Server({
                'grpc.keepalive_time_ms': 30000,
                'grpc.keepalive_timeout_ms': 5000,
                'grpc.keepalive_permit_without_calls': true,
                'grpc.http2.max_pings_without_data': 0,
                'grpc.http2.min_time_between_pings_ms': 10000,
                'grpc.http2.min_ping_interval_without_data_ms': 5000
            });

            // Add service with handlers
            this.server.addService(
                documentServiceProto.DocumentGeneratorService.service,
                this.documentHandler.getServiceMethods()
            );

            // Start server
            const grpcPort = cfg.grpc_port || 50051;
            const bindAddress = `0.0.0.0${grpcPort}`;

            await new Promise((resolve, reject) => {
                this.server.bindAsync(bindAddress, grpc.ServerCredentials.createInsecure(), (error, port) => {
                    if (error) {
                        console.error('gRPC Server failed to bind:', error.message);
                        reject(error);
                        return;
                    }

                    console.log(`gRPC Server is running on ${bindAddress}`);
                    this.server.start();
                    this.isStarted = true;
                    resolve(port);
                });
            });

        } catch (error) {
            console.error('Failed to start gRPC server:', error.message);
            throw error;
        }
    }

    /**
     * Stop the gRPC server gracefully
     */
    async stop() {
        if (!this.server || !this.isStarted) {
            return;
        }

        return new Promise((resolve) => {
            console.log('Stopping gRPC server...');
            
            this.server.tryShutdown((error) => {
                if (error) {
                    console.error('Error during graceful shutdown, forcing shutdown:', error.message);
                    this.server.forceShutdown();
                } else {
                    console.log('gRPC server stopped gracefully');
                }
                
                this.isStarted = false;
                resolve();
            });
        });
    }

    /**
     * Force shutdown the gRPC server
     */
    forceShutdown() {
        if (this.server) {
            console.log('Force shutting down gRPC server...');
            this.server.forceShutdown();
            this.isStarted = false;
            console.log('gRPC server force shutdown completed');
        }
    }

    /**
     * Check if server is running
     */
    isRunning() {
        return this.isStarted;
    }

    /**
     * Get server instance
     */
    getServer() {
        return this.server;
    }

    /**
     * Health check for gRPC server
     */
    healthCheck() {
        return {
            status: this.isStarted ? 'running' : 'stopped',
            port: cfg.grpc_port || 50051,
            services: ['DocumentGenerationService'],
            methods: ['ConvertHtml', 'GenerateDocument']
        };
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\nReceived ${signal}, shutting down gRPC server gracefully...`);
            
            try {
                await this.stop();
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error.message);
                process.exit(1);
            }
        };

        // Handle different termination signals
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGQUIT', () => shutdown('SIGQUIT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.forceShutdown();
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.forceShutdown();
            process.exit(1);
        });
    }
}

// Factory function to create and start gRPC server
const createGrpcServer = () => {
    return new GrpcServer();
};

// Legacy function for backward compatibility
const startGrpcServer = async () => {
    const grpcServer = new GrpcServer();
    await grpcServer.start();
    grpcServer.setupGracefulShutdown();
    return grpcServer;
};

module.exports = {
    GrpcServer,
    createGrpcServer,
    startGrpcServer
};
