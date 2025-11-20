const FileUtils = require('../../src/utils/fileUtils');
const fs = require('fs');
const path = require('path');

describe('FileUtils Utility', () => {
    const testDir = path.join(__dirname, '../temp-test');
    const testFile = path.join(testDir, 'test.txt');

    beforeAll(() => {
        // Ensure test directory exists
        FileUtils.ensureDirectoryExists(testDir);
    });

    afterAll(() => {
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            const files = fs.readdirSync(testDir);
            files.forEach(file => {
                FileUtils.safeDelete(path.join(testDir, file));
            });
            fs.rmdirSync(testDir);
        }
    });

    describe('ensureDirectoryExists', () => {
        test('should create directory if it does not exist', () => {
            const newDir = path.join(testDir, 'new-dir');
            FileUtils.ensureDirectoryExists(newDir);
            expect(fs.existsSync(newDir)).toBe(true);
        });

        test('should not throw if directory already exists', () => {
            expect(() => {
                FileUtils.ensureDirectoryExists(testDir);
            }).not.toThrow();
        });
    });

    describe('generateUniqueFilename', () => {
        test('should generate unique filenames', () => {
            const filename1 = FileUtils.generateUniqueFilename('test', 'txt');
            const filename2 = FileUtils.generateUniqueFilename('test', 'txt');
            
            expect(filename1).not.toBe(filename2);
            expect(filename1).toMatch(/^test_\d+_[a-zA-Z0-9]+\.txt$/);
            expect(filename2).toMatch(/^test_\d+_[a-zA-Z0-9]+\.txt$/);
        });
    });

    describe('getFileExtension', () => {
        test('should return correct file extensions', () => {
            expect(FileUtils.getFileExtension('file.txt')).toBe('txt');
            expect(FileUtils.getFileExtension('file.pdf')).toBe('pdf');
            expect(FileUtils.getFileExtension('file.name.docx')).toBe('docx');
            expect(FileUtils.getFileExtension('FILE.PDF')).toBe('pdf');
        });

        test('should handle files without extensions', () => {
            expect(FileUtils.getFileExtension('filename')).toBe('');
            expect(FileUtils.getFileExtension('.hidden')).toBe('');
        });
    });

    describe('validateFileExtension', () => {
        test('should validate allowed extensions', () => {
            const allowed = ['pdf', 'docx', 'txt'];
            
            expect(FileUtils.validateFileExtension('file.pdf', allowed)).toBe(true);
            expect(FileUtils.validateFileExtension('file.docx', allowed)).toBe(true);
            expect(FileUtils.validateFileExtension('file.jpg', allowed)).toBe(false);
        });

        test('should be case insensitive', () => {
            const allowed = ['pdf', 'docx'];
            
            expect(FileUtils.validateFileExtension('FILE.PDF', allowed)).toBe(true);
            expect(FileUtils.validateFileExtension('file.DOCX', allowed)).toBe(true);
        });
    });

    describe('safeDelete', () => {
        test('should delete existing files', () => {
            // Create test file
            fs.writeFileSync(testFile, 'test content');
            expect(fs.existsSync(testFile)).toBe(true);
            
            // Delete file
            const result = FileUtils.safeDelete(testFile);
            expect(result).toBe(true);
            expect(fs.existsSync(testFile)).toBe(false);
        });

        test('should not throw for non-existent files', () => {
            const nonExistentFile = path.join(testDir, 'nonexistent.txt');
            expect(() => {
                const result = FileUtils.safeDelete(nonExistentFile);
                expect(result).toBe(false);
            }).not.toThrow();
        });
    });

    describe('isFileAccessible', () => {
        test('should return true for accessible files', () => {
            // Create test file
            fs.writeFileSync(testFile, 'test content');
            
            expect(FileUtils.isFileAccessible(testFile)).toBe(true);
        });

        test('should return false for non-existent files', () => {
            const nonExistentFile = path.join(testDir, 'nonexistent.txt');
            expect(FileUtils.isFileAccessible(nonExistentFile)).toBe(false);
        });
    });

    describe('getFileSize', () => {
        test('should return correct file size', () => {
            const content = 'test content';
            fs.writeFileSync(testFile, content);
            
            const size = FileUtils.getFileSize(testFile);
            expect(size).toBe(Buffer.byteLength(content));
        });

        test('should return 0 for non-existent files', () => {
            const nonExistentFile = path.join(testDir, 'nonexistent.txt');
            expect(FileUtils.getFileSize(nonExistentFile)).toBe(0);
        });
    });

    describe('cleanupTempFiles', () => {
        test('should not throw for non-existent directory', () => {
            expect(() => {
                FileUtils.cleanupTempFiles('/nonexistent/directory');
            }).not.toThrow();
        });

        test('should handle empty directory', () => {
            const emptyDir = path.join(testDir, 'empty');
            FileUtils.ensureDirectoryExists(emptyDir);
            
            expect(() => {
                FileUtils.cleanupTempFiles(emptyDir);
            }).not.toThrow();
        });
    });
});
