const DocumentServiceClient = require('../grpc-client');

// Test configuration
const CLIENT_CONFIG = {
    host: 'localhost:50051',
    testTimeout: 30000
};

async function testGrpcConnection() {
    console.log('Testing gRPC connection...');
    
    const client = new DocumentServiceClient(CLIENT_CONFIG.host);
    
    try {
        // Test basic connectivity with invalid data
        const result = await client.convertHtml('', 'pdf');
        
        if (result.hasOwnProperty('success')) {
            console.log('gRPC connection successful!');
            console.log('Server response structure valid');
            return true;
        } else {
            console.log('Invalid response structure');
            return false;
        }
    } catch (error) {
        console.log('gRPC connection failed:', error.message);
        return false;
    } finally {
        client.close();
    }
}

async function testHtmlToPdfConversion() {
    console.log('\nTesting HTML to PDF conversion...');
    
    const client = new DocumentServiceClient(CLIENT_CONFIG.host);
    const startTime = Date.now();
    
    try {
        const result = await client.convertHtml('https://httpbin.org/html', 'pdf');
        const duration = Date.now() - startTime;
        
        if (result.success) {
            console.log('PDF conversion successful!');
            console.log(`File: ${result.file_name}`);
            console.log(`URL: ${result.file_url}`);
            console.log(`Duration: ${duration}ms (Server: ${result.conversion_time}ms)`);
            console.log(`Format: ${result.output_format}`);
            return true;
        } else {
            console.log('PDF conversion failed:', result.error_message);
            return false;
        }
    } catch (error) {
        console.log('PDF conversion error:', error.message);
        return false;
    } finally {
        client.close();
    }
}

async function testHtmlToDocxConversion() {
    console.log('\nTesting HTML to DOCX conversion...');
    
    const client = new DocumentServiceClient(CLIENT_CONFIG.host);
    const startTime = Date.now();
    
    try {
        const result = await client.convertHtml('https://httpbin.org/html', 'docx');
        const duration = Date.now() - startTime;
        
        if (result.success) {
            console.log('DOCX conversion successful!');
            console.log(`File: ${result.file_name}`);
            console.log(`URL: ${result.file_url}`);
            console.log(`Duration: ${duration}ms (Server: ${result.conversion_time}ms)`);
            console.log(`Format: ${result.output_format}`);
            return true;
        } else {
            console.log('DOCX conversion failed:', result.error_message);
            return false;
        }
    } catch (error) {
        console.log('DOCX conversion error:', error.message);
        return false;
    } finally {
        client.close();
    }
}

async function testErrorHandling() {
    console.log('\nTesting error handling...');
    
    const client = new DocumentServiceClient(CLIENT_CONFIG.host);
    
    try {
        // Test 1: Empty URL
        const result1 = await client.convertHtml('', 'pdf');
        if (!result1.success && result1.error_message === 'HTML link is required.') {
            console.log('Empty URL validation works');
        } else {
            console.log('Empty URL validation failed');
        }

        // Test 2: Invalid format
        const result2 = await client.convertHtml('https://httpbin.org/html', 'invalid');
        if (!result2.success && result2.error_message.includes('Invalid output format')) {
            console.log('Invalid format validation works');
        } else {
            console.log('Invalid format validation failed');
        }

        // Test 3: Invalid URL
        const result3 = await client.convertHtml('invalid-url', 'pdf');
        if (!result3.success && result3.error_message === 'Failed to fetch HTML content.') {
            console.log('Invalid URL handling works');
        } else {
            console.log('Invalid URL handling failed');
        }

        return true;
    } catch (error) {
        console.log('Error handling test failed:', error.message);
        return false;
    } finally {
        client.close();
    }
}

async function testDocumentGeneration() {
    console.log('\nTesting document generation...');
    
    const client = new DocumentServiceClient(CLIENT_CONFIG.host);
    
    try {
        const result = await client.generateDocument('https://httpbin.org/html', { test: 'data' });
        
        if (result.success) {
            console.log('Document generation successful!');
            console.log(`PDF Content length: ${result.pdf_content.length}`);
            return true;
        } else {
            console.log('Document generation failed:', result.error_message);
            return false;
        }
    } catch (error) {
        console.log('Document generation error:', error.message);
        return false;
    } finally {
        client.close();
    }
}

async function runAllTests() {
    console.log('Starting gRPC Service Integration Tests...\n');
    
    const tests = [
        { name: 'Connection Test', fn: testGrpcConnection },
        { name: 'HTML to PDF', fn: testHtmlToPdfConversion },
        { name: 'HTML to DOCX', fn: testHtmlToDocxConversion },
        { name: 'Error Handling', fn: testErrorHandling },
        { name: 'Document Generation', fn: testDocumentGeneration }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await Promise.race([
                test.fn(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Test timeout')), CLIENT_CONFIG.testTimeout)
                )
            ]);
            
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(`${test.name} timed out or crashed:`, error.message);
            failed++;
        }
    }

    console.log('\nTest Results Summary:');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

    return { passed, failed, total: tests.length };
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests()
        .then(results => {
            process.exit(results.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('Test suite crashed:', error);
            process.exit(1);
        });
}

module.exports = {
    runAllTests,
    testGrpcConnection,
    testHtmlToPdfConversion,
    testHtmlToDocxConversion,
    testErrorHandling,
    testDocumentGeneration
};
