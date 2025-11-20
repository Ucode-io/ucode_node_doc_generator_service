# Refactoring Plan - ucode_node_doc_generator_service

## Current Issues

### 1. Code Duplication
- Same business logic in both REST and gRPC servers
- Duplicate HTML conversion and document generation code
- Repeated error handling patterns

### 2. Large Files
- `index.js` (485 lines) - too many responsibilities
- `grpc-server.js` (327 lines) - mixing transport and business logic

### 3. Poor Separation of Concerns
- Business logic mixed with transport layer
- Configuration scattered across files
- No clear service boundaries

### 4. Hard-coded Values
- API secrets directly in code
- Magic numbers and strings
- No environment-based configuration

### 5. Inconsistent Error Handling
- Different error responses between REST and gRPC
- No centralized error management

## Proposed New Structure

```
src/
├── controllers/           # HTTP request handlers
│   ├── documentController.js
│   └── healthController.js
├── services/             # Business logic
│   ├── documentService.js
│   ├── htmlConverterService.js
│   └── cdnService.js
├── grpc/                 # gRPC handlers
│   ├── handlers/
│   │   └── documentHandler.js
│   └── server.js
├── middleware/           # Express middlewares
│   ├── errorHandler.js
│   └── validation.js
├── utils/               # Utility functions
│   ├── fileUtils.js
│   └── validators.js
├── config/              # Configuration
│   ├── database.js
│   ├── grpc.js
│   └── server.js
└── constants/           # Application constants
    └── index.js

tests/
├── unit/               # Unit tests
│   ├── services/
│   └── utils/
├── integration/        # Integration tests
└── fixtures/          # Test data

docs/                   # Documentation
├── api/               # API documentation
└── deployment/        # Deployment guides
```

## Implementation Steps

### Phase 1: Extract Services
1. Create `DocumentService` class
2. Create `HtmlConverterService` class  
3. Create `CdnService` class
4. Extract common utilities

### Phase 2: Separate Transport Layers
1. Create REST controllers
2. Create gRPC handlers
3. Implement common error handling

### Phase 3: Configuration Management
1. Environment-based config
2. Secrets management
3. Validation schemas

### Phase 4: Testing & Documentation
1. Unit tests for services
2. Integration tests
3. API documentation update

## Benefits

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Isolated business logic
3. **Scalability**: Easy to add new features
4. **Reusability**: Shared services between transports
5. **Reliability**: Consistent error handling
