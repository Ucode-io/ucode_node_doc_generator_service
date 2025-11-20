// Load environment variables from .env file
require('dotenv').config({ path: '/app/.env' });


const config = {
    environment: getConf("NODE_ENV", "dev"),

    cdn_endpoint: getConf("MINIO_ENDPOINT", ""),
    cdn_access_key: getConf("MINIO_ACCESS_KEY", "test-access"),
    cdn_secret_key: getConf("MINIO_SECRET_KEY", "test-key"),
    minio_port: getConf("MINIO_PORT", 9000),
    http_port: getConf("HTTP_PORT", ":3000"),
    grpc_port: getConf("GRPC_PORT", ":50051"),
};

function getConf(name, def) {
    if (process.env[name]) {
        return process.env[name];
    }
    return def;
}

module.exports = config;
