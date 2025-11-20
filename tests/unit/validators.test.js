const Validators = require('../../src/utils/validators');

describe('Validators Utility', () => {
    describe('isValidUrl', () => {
        test('should return true for valid HTTP URLs', () => {
            expect(Validators.isValidUrl('http://example.com')).toBe(true);
            expect(Validators.isValidUrl('https://example.com')).toBe(true);
            expect(Validators.isValidUrl('https://example.com/path?query=1')).toBe(true);
        });

        test('should return false for invalid URLs', () => {
            expect(Validators.isValidUrl('invalid-url')).toBe(false);
            expect(Validators.isValidUrl('')).toBe(false);
            expect(Validators.isValidUrl(null)).toBe(false);
            expect(Validators.isValidUrl(undefined)).toBe(false);
        });
    });

    describe('isValidHttpUrl', () => {
        test('should return true for HTTP/HTTPS URLs', () => {
            expect(Validators.isValidHttpUrl('http://example.com')).toBe(true);
            expect(Validators.isValidHttpUrl('https://example.com')).toBe(true);
        });

        test('should return false for non-HTTP URLs', () => {
            expect(Validators.isValidHttpUrl('ftp://example.com')).toBe(false);
            expect(Validators.isValidHttpUrl('mailto:test@example.com')).toBe(false);
            expect(Validators.isValidHttpUrl('file:///path/to/file')).toBe(false);
        });
    });

    describe('isValidOutputFormat', () => {
        test('should return true for valid formats', () => {
            expect(Validators.isValidOutputFormat('pdf')).toBe(true);
            expect(Validators.isValidOutputFormat('docx')).toBe(true);
            expect(Validators.isValidOutputFormat('PDF')).toBe(true);
            expect(Validators.isValidOutputFormat('DOCX')).toBe(true);
        });

        test('should return false for invalid formats', () => {
            expect(Validators.isValidOutputFormat('txt')).toBe(false);
            expect(Validators.isValidOutputFormat('doc')).toBe(false);
            expect(Validators.isValidOutputFormat('')).toBe(false);
            expect(Validators.isValidOutputFormat(null)).toBe(false);
        });

        test('should accept custom allowed formats', () => {
            expect(Validators.isValidOutputFormat('txt', ['txt', 'html'])).toBe(true);
            expect(Validators.isValidOutputFormat('pdf', ['txt', 'html'])).toBe(false);
        });
    });

    describe('isValidTemplateData', () => {
        test('should return true for valid objects', () => {
            expect(Validators.isValidTemplateData({})).toBe(true);
            expect(Validators.isValidTemplateData({ key: 'value' })).toBe(true);
            expect(Validators.isValidTemplateData({ nested: { key: 'value' } })).toBe(true);
        });

        test('should return false for non-objects', () => {
            expect(Validators.isValidTemplateData(null)).toBe(false);
            expect(Validators.isValidTemplateData('string')).toBe(false);
            expect(Validators.isValidTemplateData(123)).toBe(false);
            expect(Validators.isValidTemplateData([])).toBe(false);
        });
    });

    describe('sanitizeFilename', () => {
        test('should sanitize dangerous characters', () => {
            expect(Validators.sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
            expect(Validators.sanitizeFilename('file/name\\test')).toBe('file_name_test');
            expect(Validators.sanitizeFilename('file name with spaces')).toBe('file_name_with_spaces');
        });

        test('should handle empty or invalid input', () => {
            expect(Validators.sanitizeFilename('')).toBe('untitled');
            expect(Validators.sanitizeFilename(null)).toBe('untitled');
            expect(Validators.sanitizeFilename(undefined)).toBe('untitled');
        });

        test('should limit length', () => {
            const longName = 'a'.repeat(150);
            const result = Validators.sanitizeFilename(longName);
            expect(result.length).toBeLessThanOrEqual(100);
        });
    });

    describe('isValidPort', () => {
        test('should return true for valid ports', () => {
            expect(Validators.isValidPort(80)).toBe(true);
            expect(Validators.isValidPort(443)).toBe(true);
            expect(Validators.isValidPort(3000)).toBe(true);
            expect(Validators.isValidPort('8080')).toBe(true);
        });

        test('should return false for invalid ports', () => {
            expect(Validators.isValidPort(0)).toBe(false);
            expect(Validators.isValidPort(65536)).toBe(false);
            expect(Validators.isValidPort(-1)).toBe(false);
            expect(Validators.isValidPort('invalid')).toBe(false);
        });
    });

    describe('validateHtmlConversionRequest', () => {
        test('should validate complete request', () => {
            const validRequest = {
                htmlLink: 'https://example.com',
                outputFormat: 'pdf'
            };

            const result = Validators.validateHtmlConversionRequest(validRequest);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should return errors for invalid request', () => {
            const invalidRequest = {
                htmlLink: 'invalid-url',
                outputFormat: 'invalid'
            };

            const result = Validators.validateHtmlConversionRequest(invalidRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should handle missing fields', () => {
            const result = Validators.validateHtmlConversionRequest({});
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('htmlLink is required');
            expect(result.errors).toContain('outputFormat is required');
        });
    });

    describe('validateDocumentGenerationRequest', () => {
        test('should validate complete request', () => {
            const validRequest = {
                link: 'https://example.com/template.docx',
                data: { key: 'value' }
            };

            const result = Validators.validateDocumentGenerationRequest(validRequest);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should return errors for invalid request', () => {
            const invalidRequest = {
                link: 'invalid-url',
                data: 'not-an-object'
            };

            const result = Validators.validateDocumentGenerationRequest(invalidRequest);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
