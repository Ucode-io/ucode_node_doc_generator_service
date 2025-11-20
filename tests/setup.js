// Test setup file
console.log('Setting up test environment...');

// Set test environment variables if needed
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(60000);

// Clean up function
afterAll(() => {
    console.log('Cleaning up test environment...');
});
