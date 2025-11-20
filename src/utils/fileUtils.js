const fs = require('fs');
const path = require('path');

/**
 * File utility functions
 */
class FileUtils {
    /**
     * Ensure directory exists, create if not
     * @param {string} dirPath - Directory path
     */
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Clean up temporary files older than specified minutes
     * @param {string} tempDir - Temporary directory path
     * @param {number} olderThanMinutes - Files older than this will be deleted
     */
    static cleanupTempFiles(tempDir, olderThanMinutes = 60) {
        try {
            if (!fs.existsSync(tempDir)) {
                return;
            }

            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            const cutoffTime = now - (olderThanMinutes * 60 * 1000);

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up old temp file: ${file}`);
                }
            });
        } catch (error) {
            console.error('Error cleaning up temp files:', error.message);
        }
    }

    /**
     * Generate unique filename with timestamp
     * @param {string} prefix - Filename prefix
     * @param {string} extension - File extension
     * @returns {string} - Unique filename
     */
    static generateUniqueFilename(prefix, extension) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${prefix}_${timestamp}_${random}.${extension}`;
    }

    /**
     * Get file size in bytes
     * @param {string} filePath - File path
     * @returns {number} - File size in bytes
     */
    static getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Check if file exists and is readable
     * @param {string} filePath - File path
     * @returns {boolean} - File accessibility
     */
    static isFileAccessible(filePath) {
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Safe file deletion - won't throw if file doesn't exist
     * @param {string} filePath - File path to delete
     */
    static safeDelete(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error.message);
            return false;
        }
    }

    /**
     * Get file extension from filename
     * @param {string} filename - Filename
     * @returns {string} - File extension (without dot)
     */
    static getFileExtension(filename) {
        return path.extname(filename).slice(1).toLowerCase();
    }

    /**
     * Validate file extension against allowed list
     * @param {string} filename - Filename
     * @param {Array} allowedExtensions - Array of allowed extensions
     * @returns {boolean} - Validation result
     */
    static validateFileExtension(filename, allowedExtensions) {
        const extension = this.getFileExtension(filename);
        return allowedExtensions.includes(extension);
    }
}

module.exports = FileUtils;
