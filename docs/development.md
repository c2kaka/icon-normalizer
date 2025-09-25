# Development Environment Setup Guide

**Version:** 1.0  
**Date:** September 25, 2024  
**Project:** icon-normalizer  

---

## Prerequisites

### System Requirements
- **Operating System:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM:** Minimum 8GB, recommended 16GB
- **Storage:** Minimum 10GB free space
- **Network:** Stable internet connection for AI API access

### Required Software
- **Node.js:** Version 18.x LTS or higher
- **Git:** Version 2.30 or higher
- **Docker:** Version 20.10 or higher (optional)
- **VS Code:** Recommended IDE with extensions

### Development Tools
- **Package Manager:** npm or yarn
- **Database Tool:** Prisma Studio or SQLite Browser
- **API Testing:** Postman or Insomnia
- **Git GUI:** SourceTree or GitKraken (optional)

---

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/icon-normalizer.git
cd icon-normalizer
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install dependencies for all packages
npm run install:all
```

### 3. Set Up Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Set Up Database
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database with initial data
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start all services in development mode
npm run dev

# Or start specific services
npm run dev:api
npm run dev:web
npm run dev:analysis
```

### 6. Verify Setup
```bash
# Run health checks
npm run health:check

# Run tests
npm test

# Build the project
npm run build
```

---

## Detailed Setup Instructions

### Environment Configuration

#### Environment Variables
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database Configuration
DATABASE_URL="file:./dev.db"

# AI Service Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-vision-preview
AI_MAX_CONCURRENT=5
AI_TIMEOUT=30000

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# File Storage
UPLOAD_DIR=./uploads
OUTPUT_DIR=./processed
MAX_FILE_SIZE=10485760

# Cache Configuration
CACHE_TTL=3600
MAX_CACHE_SIZE=1000

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Development Settings
HOT_RELOAD=true
DEBUG_MODE=true
```

#### Environment-specific Files
- `.env.development` - Development environment
- `.env.test` - Testing environment
- `.env.production` - Production environment

### Database Setup

#### SQLite Configuration
The project uses SQLite for development with Prisma ORM:

```prisma
// schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

#### Database Commands
```bash
# Generate Prisma client
npm run db:generate

# Create new migration
npm run db:migrate:dev

# Apply migrations
npm run db:migrate

# Reset database
npm run db:reset

# View database in GUI
npm run db:studio

# Seed database
npm run db:seed
```

### Service Configuration

#### Analysis Service Configuration
```typescript
// config/analysis.ts
export const analysisConfig = {
  maxConcurrent: 5,
  timeout: 30000,
  retryAttempts: 3,
  model: 'gpt-4-vision-preview',
  confidenceThreshold: 0.7,
  categories: [
    'interface',
    'media',
    'action',
    'alert',
    'avatar',
    'communication',
    'content',
    'device',
    'editor',
    'file',
    'health',
    'image',
    'location',
    'maps',
    'navigation',
    'notification',
    'social',
    'weather',
    'text',
    'time',
    'transportation',
    'travel',
    'shopping',
    'sports',
    'science',
    'education',
    'food',
    'emoji',
    'flags'
  ]
};
```

#### Processing Service Configuration
```typescript
// config/processing.ts
export const processingConfig = {
  maxConcurrentFiles: 10,
  batchSize: 50,
  chunkSize: 100,
  progressInterval: 1000,
  allowedExtensions: ['.svg'],
  maxFileSize: 10485760, // 10MB
  tempDir: './temp',
  backupEnabled: true,
  backupInterval: 3600000 // 1 hour
};
```

### Development Tools Setup

#### VS Code Extensions
Install these extensions for optimal development experience:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint",
    "streetsidesoftware.code-spell-checker",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-docker"
  ]
}
```

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.associations": {
    "*.prisma": "prisma"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "typescriptreact"
  ]
}
```

#### Git Hooks Setup
```bash
# Install husky for git hooks
npm run prepare

# Set up pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run type-check"

# Set up commit message hook
npx husky add .husky/commit-msg "npx --no -- commitlint --edit $1"
```

---

## Development Workflow

### 1. Feature Development

#### Branch Strategy
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
gh pr create --title "feat: add your feature" --body "Description of changes"
```

#### Code Quality Checks
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run type checking
npm run type-check

# Run tests
npm test

# Run build
npm run build
```

### 2. Testing

#### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- IconAnalysisService

# Run tests with coverage
npm run test:unit:coverage

# Watch mode for development
npm run test:unit:watch
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run API tests
npm run test:api

# Run end-to-end tests
npm run test:e2e
```

#### Test Database
```bash
# Set up test database
npm run test:db:setup

# Run tests with test database
npm run test:db

# Clean up test database
npm run test:db:teardown
```

### 3. API Development

#### Local API Testing
```bash
# Start API server
npm run dev:api

# Test API endpoints
curl http://localhost:3001/api/health

# Or use Postman collection
npm run test:api:postman
```

#### API Documentation
```bash
# Generate API documentation
npm run docs:api

# Serve API docs locally
npm run docs:api:serve
```

### 4. Frontend Development

#### Local Development
```bash
# Start web development server
npm run dev:web

# Start with API proxy
npm run dev:web:proxy

# Build for production
npm run build:web
```

#### Component Development
```bash
# Generate new component
npm run generate:component IconGrid

# Storybook development
npm run storybook

# Build storybook
npm run build:storybook
```

---

## Docker Development

### Local Docker Setup

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./services/api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:./dev.db
    volumes:
      - ./services/api:/app
      - ./uploads:/app/uploads
      - ./processed:/app/processed

  web:
    build: ./packages/web
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
    volumes:
      - ./packages/web:/app
      - /app/node_modules

  db:
    image: sqlite:latest
    volumes:
      - ./data:/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

#### Docker Commands
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Execute command in container
docker-compose exec api bash
```

### Development Containers

#### VS Code Dev Containers
```json
// .devcontainer/devcontainer.json
{
  "name": "icon-normalizer",
  "dockerComposeFile": "docker-compose.yml",
  "service": "api",
  "workspaceFolder": "/app",
  "extensions": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode"
  ],
  "settings": {
    "terminal.integrated.shell.linux": "/bin/bash",
    "editor.formatOnSave": true
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
lsof -ti:3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev:api
```

#### 2. Database Connection Issues
```bash
# Reset database
npm run db:reset

# Check database file
ls -la dev.db

# Repair database
sqlite3 dev.db ".backup main.db"
mv main.db dev.db
```

#### 3. Permission Issues
```bash
# Fix file permissions
chmod 755 uploads/
chmod 755 processed/
chmod 644 dev.db
```

#### 4. Node.js Version Issues
```bash
# Use correct Node.js version
nvm use 18

# Or install specific version
nvm install 18
```

### Debugging

#### Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "program": "${workspaceFolder}/services/api/src/index.ts",
      "preLaunchTask": "npm: build:api",
      "outFiles": ["${workspaceFolder}/services/api/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Analysis Service",
      "program": "${workspaceFolder}/services/analysis/src/index.ts",
      "preLaunchTask": "npm:build:analysis",
      "outFiles": ["${workspaceFolder}/services/analysis/dist/**/*.js"]
    }
  ]
}
```

#### Logging Configuration
```typescript
// config/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Performance Issues

#### Memory Profiling
```bash
# Start with heap profiling
node --inspect services/api/src/index.ts

# Or use Chrome DevTools
npm run dev:api:profile
```

#### Load Testing
```bash
# Install load testing tool
npm install -g artillery

# Run load test
artillery quick --count 10 -n 20 http://localhost:3001/api/health
```

---

## Contributing Guidelines

### Code Standards

#### TypeScript Standards
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper null checking with optional chaining
- Document complex functions with JSDoc

#### Naming Conventions
```typescript
// Files: kebab-case
icon-analysis.service.ts
icon-grid.component.tsx

// Classes: PascalCase
class IconAnalysisService {}

// Functions: camelCase
function analyzeIcon(icon: Icon) {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_CONCURRENT_REQUESTS = 5;

// Interfaces: PascalCase with I prefix
interface IIconAnalysisResult {}
```

#### Code Structure
```typescript
// Service structure
class IconAnalysisService {
  private logger: Logger;
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
    this.logger = new Logger('IconAnalysisService');
  }

  /**
   * Analyzes an SVG icon and returns categorization results
   */
  async analyzeIcon(svgContent: string): Promise<IIconAnalysisResult> {
    try {
      // Implementation
    } catch (error) {
      this.logger.error('Failed to analyze icon', error);
      throw new IconAnalysisError('Analysis failed', error);
    }
  }
}
```

### Commit Guidelines

#### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

#### Examples
```bash
feat(analysis): add visual similarity detection
fix(api): handle file upload errors properly
docs(readme): update development setup instructions
style(icons): format SVG processing code
refactor(processing): optimize batch processing algorithm
```

### Pull Request Process

#### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review of code completed
- [ ] Documentation updated if necessary
- [ ] No breaking changes
- [ ] Ready for review
```

#### Review Process
1. Automated checks pass (lint, type-check, tests)
2. At least one team member review
3. All feedback addressed
4. CI/CD pipeline passes
5. Merge to main branch

---

## Deployment

### Environment Setup

#### Production Environment Variables
```env
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./prod.db"
JWT_SECRET=your_production_jwt_secret
OPENAI_API_KEY=your_production_openai_key
LOG_LEVEL=warn
```

#### Production Build
```bash
# Build all packages
npm run build:all

# Run production tests
npm run test:production

# Create production package
npm run package
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build:all

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Production
        run: |
          # Deployment commands
          npm run deploy:production
```

---

## Support

### Getting Help
- **Documentation:** Check the `/docs` directory
- **Issues:** Create an issue on GitHub
- **Discussions:** Join GitHub Discussions
- **Discord:** Join our Discord server
- **Email:** support@icon-normalizer.com

### Bug Reports
When reporting bugs, please include:
- Operating system and version
- Node.js version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages and stack traces

### Feature Requests
When requesting features, please include:
- Feature description
- Use case and benefits
- Proposed implementation (if known)
- Alternative approaches considered

---

*This guide will be updated as the project evolves. Please check the repository for the latest version.*