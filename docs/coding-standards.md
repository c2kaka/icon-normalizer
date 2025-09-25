# Coding Standards and Guidelines

**Version:** 1.0  
**Date:** September 25, 2024  
**Project:** icon-normalizer  

---

## Table of Contents
1. [General Principles](#general-principles)
2. [TypeScript Guidelines](#typescript-guidelines)
3. [Code Style and Formatting](#code-style-and-formatting)
4. [File and Directory Structure](#file-and-directory-structure)
5. [Component Guidelines](#component-guidelines)
6. [Service Guidelines](#service-guidelines)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation Standards](#documentation-standards)
9. [Git Workflow](#git-workflow)
10. [Code Review Guidelines](#code-review-guidelines)

---

## General Principles

### Core Values
1. **Readability:** Code should be easy to read and understand
2. **Maintainability:** Code should be easy to modify and extend
3. **Testability:** Code should be easy to test and debug
4. **Performance:** Code should be efficient and scalable
5. **Security:** Code should be secure and protect user data

### Design Principles
- **Single Responsibility:** Each component/service should have one clear purpose
- **Open/Closed Principle:** Open for extension, closed for modification
- **Dependency Inversion:** Depend on abstractions, not concretions
- **Don't Repeat Yourself:** Avoid code duplication
- **Keep It Simple:** Simple solutions are preferred over complex ones

### Error Handling Principles
- **Fail Fast:** Detect and report errors as early as possible
- **Graceful Degradation:** Provide fallback behavior when possible
- **Informative Errors:** Provide clear, actionable error messages
- **Proper Logging:** Log errors with appropriate context and severity

---

## TypeScript Guidelines

### Type System Usage

#### Strict TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### Type Definitions
```typescript
// Prefer interfaces over types for object shapes
interface IconAnalysisResult {
  id: string;
  category: string;
  confidence: number;
  tags: string[];
  duplicates: string[];
  metadata: IconMetadata;
}

// Use type aliases for union types and primitives
type IconCategory = 
  | 'interface' 
  | 'media' 
  | 'action' 
  | 'alert'
  | 'communication';

// Use generics for reusable components
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// Use utility types for common transformations
type IconSummary = Pick<IconAnalysisResult, 'id' | 'category' | 'confidence'>;
```

#### Advanced TypeScript Features
```typescript
// Use mapped types for transformations
type IconUpdateFields = {
  [K in keyof IconAnalysisResult]?: IconAnalysisResult[K];
};

// Use conditional types for advanced type logic
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// Use template literal types for string manipulation
type IconEvent = `icon:${'analyzed' | 'processed' | 'categorized'}`;
```

### Function and Method Guidelines

#### Function Signatures
```typescript
// Use clear parameter names with proper types
async function analyzeIcon(
  svgContent: string,
  options?: AnalysisOptions
): Promise<IconAnalysisResult> {
  // Implementation
}

// Use callback functions for async operations
function batchProcessIcons(
  icons: string[],
  onProgress: (progress: number, total: number) => void,
  onComplete: (results: IconAnalysisResult[]) => void
): void {
  // Implementation
}

// Use function overloads for different parameter types
function processIcon(input: string): Promise<IconAnalysisResult>;
function processIcon(input: File): Promise<IconAnalysisResult>;
function processIcon(input: string | File): Promise<IconAnalysisResult> {
  // Implementation
}
```

#### Error Handling
```typescript
// Create custom error classes
class IconAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'IconAnalysisError';
  }
}

// Use proper error handling in async functions
async function safeAnalyzeIcon(svgContent: string): Promise<IconAnalysisResult> {
  try {
    return await analyzeIcon(svgContent);
  } catch (error) {
    if (error instanceof IconAnalysisError) {
      logger.error('Icon analysis failed', { code: error.code, details: error.details });
      throw error;
    }
    logger.error('Unexpected error during icon analysis', error);
    throw new IconAnalysisError('Analysis failed', 'UNEXPECTED_ERROR', error);
  }
}
```

#### Async/Await Best Practices
```typescript
// Use async/await consistently
async function processMultipleIcons(icons: string[]): Promise<IconAnalysisResult[]> {
  // Use Promise.all for concurrent operations
  const promises = icons.map(icon => analyzeIcon(icon));
  
  try {
    return await Promise.all(promises);
  } catch (error) {
    logger.error('Failed to process icons', error);
    throw new IconAnalysisError('Batch processing failed', 'BATCH_ERROR');
  }
}

// Use Promise.allSettled for partial success
async function processIconsWithPartialSuccess(icons: string[]): Promise<{
  successful: IconAnalysisResult[];
  failed: { icon: string; error: Error }[];
}> {
  const results = await Promise.allSettled(
    icons.map(icon => analyzeIcon(icon))
  );

  const successful: IconAnalysisResult[] = [];
  const failed: { icon: string; error: Error }[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({ icon: icons[index], error: result.reason });
    }
  });

  return { successful, failed };
}
```

### Class and Interface Guidelines

#### Class Structure
```typescript
// Use proper class structure with clear responsibilities
class IconAnalysisService {
  private readonly logger: Logger;
  private readonly config: AnalysisConfig;
  private readonly cache: Cache<string, IconAnalysisResult>;
  private readonly metrics: Metrics;

  constructor(
    config: AnalysisConfig,
    logger: Logger,
    cache: Cache<string, IconAnalysisResult>,
    metrics: Metrics
  ) {
    this.config = config;
    this.logger = logger;
    this.cache = cache;
    this.metrics = metrics;
  }

  /**
   * Analyzes an SVG icon and returns categorization results
   * @param svgContent The SVG content to analyze
   * @param options Optional analysis configuration
   * @returns Promise resolving to analysis result
   */
  async analyzeIcon(
    svgContent: string,
    options?: AnalysisOptions
  ): Promise<IconAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(svgContent);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        this.metrics.increment('cache.hits');
        return cached;
      }

      this.metrics.increment('cache.misses');
      
      // Perform analysis
      const result = await this.performAnalysis(svgContent, options);
      
      // Cache result
      await this.cache.set(cacheKey, result, this.config.cacheTTL);
      
      // Record metrics
      this.metrics.timing('analysis.duration', Date.now() - startTime);
      this.metrics.increment('analysis.success');
      
      return result;
    } catch (error) {
      this.metrics.increment('analysis.errors');
      this.logger.error('Icon analysis failed', { error, svgContent: svgContent.substring(0, 100) });
      throw new IconAnalysisError('Analysis failed', 'ANALYSIS_ERROR', error);
    }
  }

  private generateCacheKey(svgContent: string): string {
    return `icon:${crypto.createHash('sha256').update(svgContent).digest('hex')}`;
  }

  private async performAnalysis(
    svgContent: string,
    options?: AnalysisOptions
  ): Promise<IconAnalysisResult> {
    // Implementation
  }
}
```

#### Interface Design
```typescript
// Use interfaces for contracts and data shapes
interface IconAnalysisService {
  analyzeIcon(svgContent: string, options?: AnalysisOptions): Promise<IconAnalysisResult>;
  batchProcessIcons(icons: string[], options?: BatchOptions): Promise<IconAnalysisResult[]>;
  getAnalysisHistory(iconId: string): Promise<AnalysisResult[]>;
  clearCache(): Promise<void>;
}

// Use abstract classes for common functionality
abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly config: ServiceConfig;

  constructor(logger: Logger, config: ServiceConfig) {
    this.logger = logger;
    this.config = config;
  }

  protected abstract initialize(): Promise<void>;
  protected abstract cleanup(): Promise<void>;

  protected logError(message: string, error: Error, context?: any): void {
    this.logger.error(message, { error: error.message, stack: error.stack, ...context });
  }
}
```

---

## Code Style and Formatting

### Naming Conventions

#### Files and Directories
```typescript
// Files: kebab-case
icon-analysis.service.ts
icon-grid.component.tsx
icon-analysis.service.spec.ts
use-icon-analysis.hook.ts
icon-types.ts
icon-constants.ts

// Directories: kebab-case
services/
components/
hooks/
types/
utils/
__tests__/
__mocks__/
```

#### Variables and Constants
```typescript
// Variables: camelCase
const iconName = 'arrow-left';
const processingTime = 1500;
const analysisResults: IconAnalysisResult[] = [];

// Constants: SCREAMING_SNAKE_CASE
const MAX_CONCURRENT_REQUESTS = 5;
const DEFAULT_TIMEOUT = 30000;
const SUPPORTED_FORMATS = ['.svg'] as const;

// Boolean: prefix with is/has/should
const isActive = true;
const hasError = false;
const shouldProcess = true;

// Private properties: prefix with underscore
class IconService {
  private _cache: Map<string, IconAnalysisResult>;
  private _isInitialized = false;
}
```

#### Functions and Methods
```typescript
// Functions: camelCase, descriptive names
function analyzeIcon(svgContent: string): Promise<IconAnalysisResult> {
  // Implementation
}

function calculateSimilarityScore(icon1: Icon, icon2: Icon): number {
  // Implementation
}

// Event handlers: prefix with handle
function handleIconClick(event: React.MouseEvent<HTMLDivElement>): void {
  // Implementation
}

// Async functions: clearly indicate async behavior
async function fetchIconMetadata(iconId: string): Promise<IconMetadata> {
  // Implementation
}
```

#### Classes and Interfaces
```typescript
// Classes: PascalCase
class IconAnalysisService {
  // Implementation
}

// Interfaces: PascalCase, optional I prefix
interface IconAnalysisResult {
  id: string;
  category: string;
  confidence: number;
}

// Types: PascalCase
type IconCategory = 'interface' | 'media' | 'action';

// Enums: PascalCase
enum ProcessingStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed'
}
```

### Formatting Rules

#### TypeScript Formatting
```typescript
// Use consistent indentation (2 spaces)
class IconProcessor {
  async processIcon(icon: Icon): Promise<ProcessingResult> {
    try {
      const result = await this.analyzeIcon(icon);
      return {
        success: true,
        data: result,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Use consistent spacing around operators
const sum = a + b;
const result = condition ? value1 : value2;

// Use consistent trailing commas in multi-line structures
const icon = {
  id: 'arrow-left',
  category: 'navigation',
  tags: ['arrow', 'left', 'back'],
  metadata: {
    size: { width: 24, height: 24 },
    color: 'currentColor'
  }
};

// Use consistent line breaks and parentheses
function longFunctionName(
  parameter1: string,
  parameter2: number,
  parameter3: boolean
): ReturnType {
  // Implementation
}
```

#### Import and Export Organization
```typescript
// Group imports by type with empty lines between groups
// Third-party imports
import express from 'express';
import { OpenAI } from 'openai';
import winston from 'winston';

// Internal imports
import { IconAnalysisResult } from '../types/icon';
import { AnalysisService } from '../services/analysis.service';
import { logger } from '../utils/logger';

// Relative imports
import { ProcessingError } from './processing.error';
import { analysisConfig } from './analysis.config';

// Use named exports for most cases
export { IconAnalysisService, AnalysisResult };

// Use default exports for main entry points
export default IconAnalysisService;

// Re-export types and utilities
export type { IconCategory, IconMetadata } from '../types/icon';
export { analysisConfig } from './analysis.config';
```

### Code Structure Patterns

#### Conditional Logic
```typescript
// Use early returns for better readability
function validateIcon(icon: Icon): ValidationResult {
  if (!icon.id) {
    return { valid: false, error: 'Icon ID is required' };
  }

  if (!icon.content) {
    return { valid: false, error: 'Icon content is required' };
  }

  if (!SUPPORTED_FORMATS.includes(icon.format)) {
    return { valid: false, error: `Unsupported format: ${icon.format}` };
  }

  return { valid: true };
}

// Use object lookups for simple conditions
function getIconCategoryType(category: string): CategoryType {
  const categoryMap: Record<string, CategoryType> = {
    'interface': 'ui',
    'media': 'multimedia',
    'action': 'interactive',
    'alert': 'notification'
  };

  return categoryMap[category] || 'unknown';
}

// Use destructuring for object properties
function processIconResult({ id, category, confidence, tags }: IconAnalysisResult) {
  console.log(`Processing ${id} from ${category} category`);
  return { id, category, confidence, tags };
}
```

#### Array and Object Operations
```typescript
// Use functional array methods
const activeIcons = icons
  .filter(icon => icon.isActive)
  .map(icon => ({
    id: icon.id,
    name: icon.name,
    category: icon.category
  }));

// Use spread operator for immutability
const updatedIcons = icons.map(icon => 
  icon.id === targetId ? { ...icon, category: newCategory } : icon
);

// Use Object.entries and Object.fromEntries for transformations
const categoryCounts = Object.fromEntries(
  Object.entries(
    icons.reduce((acc, icon) => {
      acc[icon.category] = (acc[icon.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a)
);
```

---

## File and Directory Structure

### Project Structure
```
icon-normalizer/
├── docs/                          # Documentation
│   ├── architecture.md
│   ├── development.md
│   └── api-specification.md
├── packages/                      # Shared packages
│   ├── types/                     # Type definitions
│   ├── utils/                     # Utility functions
│   ├── constants/                 # Constants and configuration
│   └── hooks/                     # Custom React hooks
├── services/                      # Backend services
│   ├── api/                       # API gateway
│   ├── analysis/                  # AI analysis service
│   ├── processing/                # File processing service
│   └── metadata/                  # Metadata management
├── web/                           # Frontend application
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   ├── utils/                # Utility functions
│   │   ├── types/                # Type definitions
│   │   └── styles/               # Styles and themes
│   └── public/                   # Static assets
├── cli/                          # Command-line interface
├── shared/                       # Shared libraries
├── tests/                        # Test files
├── scripts/                      # Build and deployment scripts
├── config/                       # Configuration files
├── .github/                      # GitHub workflows
├── docker/                       # Docker configuration
└── prisma/                       # Database schema
```

### Service Structure
```
services/analysis/
├── src/
│   ├── index.ts                  # Service entry point
│   ├── analysis.service.ts       # Main service class
│   ├── types/                    # Service-specific types
│   │   ├── index.ts
│   │   └── analysis.types.ts
│   ├── utils/                    # Utility functions
│   │   ├── index.ts
│   │   └── image-processor.ts
│   ├── config/                   # Configuration
│   │   ├── index.ts
│   │   └── analysis.config.ts
│   ├── errors/                   # Error classes
│   │   ├── index.ts
│   │   └── analysis-error.ts
│   └── __tests__/               # Test files
│       ├── analysis.service.spec.ts
│       └── image-processor.spec.ts
├── package.json
└── tsconfig.json
```

### Component Structure
```
web/src/components/
├── IconGrid/
│   ├── IconGrid.tsx              # Main component
│   ├── IconGrid.types.ts         # Component types
│   ├── IconGrid.styles.ts       # Component styles
│   ├── IconGrid.test.tsx        # Component tests
│   └── index.ts                 # Component export
├── IconViewer/
│   ├── IconViewer.tsx
│   ├── IconViewer.types.ts
│   ├── IconViewer.styles.ts
│   ├── IconViewer.test.tsx
│   └── index.ts
└── common/                       # Shared components
    ├── Button/
    ├── Input/
    └── Modal/
```

### Test Structure
```
tests/
├── unit/                         # Unit tests
│   ├── services/
│   │   ├── analysis.service.spec.ts
│   │   └── processing.service.spec.ts
│   ├── components/
│   │   ├── IconGrid.spec.tsx
│   │   └── IconViewer.spec.tsx
│   └── utils/
│       └── image-processor.spec.ts
├── integration/                  # Integration tests
│   ├── api/
│   │   ├── icon-analysis.spec.ts
│   │   └── batch-processing.spec.ts
│   └── services/
│       └── analysis-integration.spec.ts
├── e2e/                          # End-to-end tests
│   ├── icon-upload.spec.ts
│   ├── batch-processing.spec.ts
│   └── search-functionality.spec.ts
└── fixtures/                     # Test fixtures
    ├── icons/
    ├── sample-data/
    └── mock-responses/
```

---

## Component Guidelines

### React Component Guidelines

#### Functional Components
```typescript
// Use functional components with hooks
interface IconGridProps {
  icons: Icon[];
  onIconSelect?: (icon: Icon) => void;
  className?: string;
}

const IconGrid: React.FC<IconGridProps> = ({ 
  icons, 
  onIconSelect, 
  className = '' 
}) => {
  const [selectedIcon, setSelectedIcon] = useState<Icon | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize expensive computations
  const filteredIcons = useMemo(() => {
    return icons.filter(icon => 
      icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icon.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [icons, searchTerm]);

  // Use useCallback for event handlers
  const handleIconClick = useCallback((icon: Icon) => {
    setSelectedIcon(icon);
    onIconSelect?.(icon);
  }, [onIconSelect]);

  return (
    <div className={`icon-grid ${className}`}>
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search icons..."
      />
      <div className="icon-grid__container">
        {filteredIcons.map(icon => (
          <IconCard
            key={icon.id}
            icon={icon}
            isSelected={selectedIcon?.id === icon.id}
            onClick={handleIconClick}
          />
        ))}
      </div>
    </div>
  );
};
```

#### Component Types
```typescript
// Define component-specific types
interface IconCardProps {
  icon: Icon;
  isSelected?: boolean;
  onClick?: (icon: Icon) => void;
  className?: string;
}

// Use component generics for reusable components
interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
}

const DataGrid = <T extends { id: string }>({
  data,
  columns,
  onRowClick,
  loading = false
}: DataGridProps<T>) => {
  // Implementation
};
```

#### Custom Hooks
```typescript
// Create custom hooks for reusable logic
function useIconAnalysis() {
  const [analysisResult, setAnalysisResult] = useState<IconAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyzeIcon = useCallback(async (svgContent: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await analysisService.analyzeIcon(svgContent);
      setAnalysisResult(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysisResult, loading, error, analyzeIcon };
}

// Hook for data fetching
function useIcons(category?: string) {
  const [icons, setIcons] = useState<Icon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIcons = async () => {
      try {
        const data = await iconService.getIcons(category);
        setIcons(data);
      } catch (error) {
        console.error('Failed to fetch icons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIcons();
  }, [category]);

  return { icons, loading };
}
```

### Component Best Practices

#### Performance Optimization
```typescript
// Use React.memo for expensive components
const IconCard = React.memo<IconCardProps>(({ icon, isSelected, onClick }) => {
  return (
    <div 
      className={`icon-card ${isSelected ? 'icon-card--selected' : ''}`}
      onClick={() => onClick?.(icon)}
    >
      <img src={icon.url} alt={icon.name} />
      <span className="icon-card__name">{icon.name}</span>
    </div>
  );
});

// Use useMemo for expensive calculations
const useIconStats = (icons: Icon[]) => {
  return useMemo(() => {
    const categories = icons.reduce((acc, icon) => {
      acc[icon.category] = (acc[icon.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalSize = icons.reduce((sum, icon) => sum + icon.size, 0);

    return { categories, totalSize, iconCount: icons.length };
  }, [icons]);
};

// Use useCallback for stable function references
const useIconHandlers = () => {
  const handleIconSelect = useCallback((icon: Icon) => {
    // Handle icon selection
  }, []);

  const handleIconDelete = useCallback((iconId: string) => {
    // Handle icon deletion
  }, []);

  return { handleIconSelect, handleIconDelete };
};
```

#### Error Boundaries
```typescript
// Create error boundaries for error handling
class IconAnalysisErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('IconAnalysisErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong with icon analysis.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use with components that might fail
<IconAnalysisErrorBoundary>
  <IconAnalysisComponent />
</IconAnalysisErrorBoundary>
```

---

## Service Guidelines

### Service Architecture

#### Service Base Class
```typescript
// Create a base service class for common functionality
abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly config: ServiceConfig;
  protected readonly metrics: Metrics;
  protected isInitialized = false;

  constructor(
    logger: Logger,
    config: ServiceConfig,
    metrics: Metrics
  ) {
    this.logger = logger;
    this.config = config;
    this.metrics = metrics;
  }

  abstract initialize(): Promise<void>;
  abstract cleanup(): Promise<void>;

  protected async executeWithMetrics<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      this.metrics.timing(`${operation}.duration`, Date.now() - startTime);
      this.metrics.increment(`${operation}.success`);
      return result;
    } catch (error) {
      this.metrics.increment(`${operation}.errors`);
      this.logger.error(`${operation} failed`, error);
      throw error;
    }
  }

  protected validateInput<T>(input: T, validator: (input: T) => boolean): void {
    if (!validator(input)) {
      throw new ValidationError('Invalid input', { input });
    }
  }
}
```

#### Service Implementation
```typescript
class IconAnalysisService extends BaseService {
  private readonly aiClient: OpenAI;
  private readonly cache: Cache<string, IconAnalysisResult>;
  private readonly imageProcessor: ImageProcessor;

  constructor(
    logger: Logger,
    config: AnalysisConfig,
    metrics: Metrics,
    aiClient: OpenAI,
    cache: Cache<string, IconAnalysisResult>,
    imageProcessor: ImageProcessor
  ) {
    super(logger, config, metrics);
    this.aiClient = aiClient;
    this.cache = cache;
    this.imageProcessor = imageProcessor;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('Initializing IconAnalysisService');
    
    // Initialize dependencies
    await this.imageProcessor.initialize();
    
    this.isInitialized = true;
    this.logger.info('IconAnalysisService initialized successfully');
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up IconAnalysisService');
    
    // Cleanup resources
    await this.cache.cleanup();
    await this.imageProcessor.cleanup();
    
    this.isInitialized = false;
    this.logger.info('IconAnalysisService cleaned up');
  }

  async analyzeIcon(
    svgContent: string,
    options?: AnalysisOptions
  ): Promise<IconAnalysisResult> {
    return this.executeWithMetrics('analyzeIcon', async () => {
      this.validateInput(svgContent, this.validateSvgContent);
      
      // Check cache
      const cacheKey = this.generateCacheKey(svgContent);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        this.logger.debug('Cache hit for icon analysis');
        return cached;
      }

      // Perform analysis
      const result = await this.performAnalysis(svgContent, options);
      
      // Cache result
      await this.cache.set(cacheKey, result, this.config.cacheTTL);
      
      return result;
    });
  }

  private async performAnalysis(
    svgContent: string,
    options?: AnalysisOptions
  ): Promise<IconAnalysisResult> {
    // Convert SVG to image for visual analysis
    const imageData = await this.imageProcessor.svgToImage(svgContent);
    
    // Analyze with AI
    const aiResponse = await this.aiAnalysis(imageData, svgContent);
    
    // Process and return results
    return this.processAiResponse(aiResponse, svgContent);
  }

  private async aiAnalysis(
    imageData: Buffer,
    svgContent: string
  ): Promise<AIResponse> {
    const prompt = this.buildAnalysisPrompt(imageData, svgContent);
    
    const response = await this.aiClient.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64:${imageData.toString('base64')}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private validateSvgContent(svgContent: string): boolean {
    return typeof svgContent === 'string' && 
           svgContent.trim().length > 0 &&
           svgContent.includes('<svg');
  }

  private generateCacheKey(svgContent: string): string {
    return `icon:${crypto.createHash('sha256').update(svgContent).digest('hex')}`;
  }
}
```

### Service Communication

#### API Service Implementation
```typescript
class ApiService extends BaseService {
  private readonly app: Express;
  private readonly analysisService: IconAnalysisService;
  private readonly processingService: ProcessingService;

  constructor(
    logger: Logger,
    config: ApiConfig,
    metrics: Metrics,
    analysisService: IconAnalysisService,
    processingService: ProcessingService
  ) {
    super(logger, config, metrics);
    this.analysisService = analysisService;
    this.processingService = processingService;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors(this.config.cors));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    this.app.use('/api/', limiter);
    
    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Icon analysis
    this.app.post('/api/icons/analyze', async (req, res, next) => {
      try {
        const { svgContent, options } = req.body;
        
        if (!svgContent) {
          return res.status(400).json({ error: 'svgContent is required' });
        }

        const result = await this.analysisService.analyzeIcon(svgContent, options);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // Batch processing
    this.app.post('/api/icons/batch-analyze', async (req, res, next) => {
      try {
        const { icons, options } = req.body;
        
        if (!Array.isArray(icons) || icons.length === 0) {
          return res.status(400).json({ 
            error: 'icons must be a non-empty array' 
          });
        }

        if (icons.length > this.config.maxBatchSize) {
          return res.status(400).json({ 
            error: `Batch size cannot exceed ${this.config.maxBatchSize}` 
          });
        }

        const result = await this.analysisService.batchProcessIcons(icons, options);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // Error handling middleware
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('API Error', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({ 
          error: error.message,
          details: error.details 
        });
      }

      if (error instanceof AuthenticationError) {
        return res.status(401).json({ 
          error: error.message 
        });
      }

      res.status(500).json({ 
        error: 'Internal server error' 
      });
    });
  }

  async start(): Promise<void> {
    await this.initialize();
    
    this.app.listen(this.config.port, () => {
      this.logger.info(`API server running on port ${this.config.port}`);
    });
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }
}
```

---

## Testing Guidelines

### Unit Testing

#### Test Structure
```typescript
// Use descriptive test names
describe('IconAnalysisService', () => {
  let service: IconAnalysisService;
  let mockAiClient: jest.Mocked<OpenAI>;
  let mockCache: jest.Mocked<Cache<string, IconAnalysisResult>>;

  beforeEach(() => {
    // Setup mocks
    mockAiClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    } as any;

    const logger = createMockLogger();
    const config = createMockConfig();
    const metrics = createMockMetrics();

    service = new IconAnalysisService(
      logger,
      config,
      metrics,
      mockAiClient,
      mockCache
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeIcon', () => {
    it('should analyze an icon successfully', async () => {
      // Arrange
      const svgContent = '<svg><path d="M0 0 L10 10"/></svg>';
      const mockResult = createMockAnalysisResult();
      
      mockCache.get.mockResolvedValue(null);
      mockAiClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: { content: JSON.stringify(mockResult) }
        }]
      } as any);

      // Act
      const result = await service.analyzeIcon(svgContent);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockAiClient.chat.completions.create).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should return cached result when available', async () => {
      // Arrange
      const svgContent = '<svg><path d="M0 0 L10 10"/></svg>';
      const cachedResult = createMockAnalysisResult();
      
      mockCache.get.mockResolvedValue(cachedResult);

      // Act
      const result = await service.analyzeIcon(svgContent);

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockAiClient.chat.completions.create).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should throw error when SVG content is invalid', async () => {
      // Arrange
      const invalidSvgContent = '';

      // Act & Assert
      await expect(service.analyzeIcon(invalidSvgContent))
        .rejects.toThrow('Invalid input');
    });

    it('should handle AI service failures gracefully', async () => {
      // Arrange
      const svgContent = '<svg><path d="M0 0 L10 10"/></svg>';
      
      mockCache.get.mockResolvedValue(null);
      mockAiClient.chat.completions.create.mockRejectedValue(
        new Error('AI service unavailable')
      );

      // Act & Assert
      await expect(service.analyzeIcon(svgContent))
        .rejects.toThrow('Analysis failed');
    });
  });
});
```

#### Test Utilities
```typescript
// Create test utilities
export function createMockIcon(overrides: Partial<Icon> = {}): Icon {
  return {
    id: 'test-icon',
    name: 'Test Icon',
    content: '<svg><path d="M0 0 L10 10"/></svg>',
    category: 'interface',
    tags: ['test'],
    size: 1024,
    ...overrides
  };
}

export function createMockAnalysisResult(overrides: Partial<IconAnalysisResult> = {}): IconAnalysisResult {
  return {
    id: 'test-result',
    category: 'interface/navigation',
    confidence: 0.9,
    tags: ['arrow', 'navigation'],
    duplicates: [],
    metadata: {
      size: { width: 24, height: 24 },
      color: 'currentColor'
    },
    ...overrides
  };
}

export function createMockLogger(): jest.Mocked<Logger> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  } as any;
}

export function createMockConfig(): AnalysisConfig {
  return {
    model: 'gpt-4-vision-preview',
    maxConcurrent: 5,
    timeout: 30000,
    cacheTTL: 3600,
    confidenceThreshold: 0.7
  };
}
```

### Integration Testing

#### API Integration Tests
```typescript
describe('API Integration', () => {
  let app: Express;
  let server: any;
  let analysisService: IconAnalysisService;

  beforeAll(async () => {
    // Setup real service instances
    analysisService = await createAnalysisService();
    
    const apiService = new ApiService(
      createMockLogger(),
      createMockApiConfig(),
      createMockMetrics(),
      analysisService,
      createMockProcessingService()
    );

    app = express();
    app.use(express.json());
    app.use('/api', apiService.getRouter());
    
    server = app.listen(0); // Use random port
  });

  afterAll(async () => {
    await server.close();
    await analysisService.cleanup();
  });

  describe('POST /api/icons/analyze', () => {
    it('should analyze icon and return result', async () => {
      const response = await request(app)
        .post('/api/icons/analyze')
        .send({
          svgContent: '<svg><path d="M0 0 L10 10"/></svg>'
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('category');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should return 400 for missing SVG content', async () => {
      await request(app)
        .post('/api/icons/analyze')
        .send({})
        .expect(400);
    });

    it('should return 500 for invalid SVG content', async () => {
      await request(app)
        .post('/api/icons/analyze')
        .send({
          svgContent: 'invalid-svg'
        })
        .expect(500);
    });
  });
});
```

### E2E Testing

#### E2E Test Structure
```typescript
describe('Icon Analysis E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    await page.goto('http://localhost:3000');
  });

  describe('Icon Upload and Analysis', () => {
    it('should allow user to upload and analyze icon', async () => {
      // Navigate to upload page
      await page.click('[data-testid="upload-button"]');
      
      // Upload file
      const fileInput = await page.$('input[type="file"]');
      await fileInput?.setInputFiles('./test-fixtures/sample-icon.svg');
      
      // Wait for analysis to complete
      await page.waitForSelector('[data-testid="analysis-results"]', {
        timeout: 30000
      });
      
      // Verify results
      const categoryElement = await page.$('[data-testid="icon-category"]');
      expect(categoryElement).toBeTruthy();
      
      const confidenceElement = await page.$('[data-testid="icon-confidence"]');
      expect(confidenceElement).toBeTruthy();
    });

    it('should show error for invalid file upload', async () => {
      await page.click('[data-testid="upload-button"]');
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput?.setInputFiles('./test-fixtures/invalid-file.txt');
      
      // Wait for error message
      await page.waitForSelector('[data-testid="error-message"]', {
        timeout: 10000
      });
      
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Invalid file');
    });
  });
});
```

---

## Documentation Standards

### Code Documentation

#### JSDoc Guidelines
```typescript
/**
 * Analyzes an SVG icon and returns categorization results
 * @param svgContent - The SVG content to analyze
 * @param options - Optional analysis configuration
 * @returns Promise resolving to analysis result
 * @throws {IconAnalysisError} When analysis fails
 * 
 * @example
 * const result = await analyzeIcon('<svg><path d="M0 0 L10 10"/></svg>');
 * console.log(result.category); // 'interface/navigation'
 */
async function analyzeIcon(
  svgContent: string,
  options?: AnalysisOptions
): Promise<IconAnalysisResult> {
  // Implementation
}

/**
 * Configuration for icon analysis
 * @interface AnalysisConfig
 */
interface AnalysisConfig {
  /** AI model to use for analysis */
  model: string;
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Cache TTL in seconds */
  cacheTTL: number;
  /** Minimum confidence threshold */
  confidenceThreshold: number;
}

/**
 * Custom error for icon analysis failures
 * @class IconAnalysisError
 * @extends {Error}
 */
class IconAnalysisError extends Error {
  /**
   * Error code for categorization
   * @type {string}
   */
  public readonly code: string;
  
  /**
   * Additional error details
   * @type {any}
   */
  public readonly details?: any;

  /**
   * Creates an instance of IconAnalysisError
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {any} [details] - Additional error details
   */
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'IconAnalysisError';
    this.code = code;
    this.details = details;
  }
}
```

#### README Files
```markdown
# Icon Analysis Service

## Overview
The Icon Analysis Service provides AI-powered categorization and analysis of SVG icons.

## Features
- Multi-modal icon analysis (visual + structural + semantic)
- Duplicate detection and similarity scoring
- Confidence-based categorization
- Caching for improved performance

## Usage
```typescript
import { IconAnalysisService } from '@icon-normalizer/analysis';

const service = new IconAnalysisService(config);
await service.initialize();

const result = await service.analyzeIcon(svgContent);
console.log(result.category);
```

## API
### analyzeIcon(svgContent, options?)
Analyzes an SVG icon and returns categorization results.

**Parameters:**
- `svgContent` (string): The SVG content to analyze
- `options` (AnalysisOptions, optional): Analysis configuration

**Returns:** Promise<IconAnalysisResult>

**Throws:** IconAnalysisError

## Configuration
```typescript
const config = {
  model: 'gpt-4-vision-preview',
  maxConcurrent: 5,
  timeout: 30000,
  cacheTTL: 3600,
  confidenceThreshold: 0.7
};
```

## Examples
See the `/examples` directory for usage examples.
```

### API Documentation

#### OpenAPI Specification
```yaml
openapi: 3.0.0
info:
  title: Icon Normalizer API
  version: 1.0.0
  description: AI-powered icon analysis and categorization

paths:
  /api/icons/analyze:
    post:
      summary: Analyze an SVG icon
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - svgContent
              properties:
                svgContent:
                  type: string
                  description: SVG content to analyze
                options:
                  $ref: '#/components/schemas/AnalysisOptions'
      responses:
        '200':
          description: Analysis result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IconAnalysisResult'
        '400':
          description: Invalid request
        '500':
          description: Internal server error

components:
  schemas:
    IconAnalysisResult:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier for the analysis
        category:
          type: string
          description: Predicted icon category
        confidence:
          type: number
          format: float
          minimum: 0
          maximum: 1
          description: Confidence score (0-1)
        tags:
          type: array
          items:
            type: string
          description: Predicted tags for the icon
        duplicates:
          type: array
          items:
            type: string
          description: IDs of duplicate icons
```

---

## Git Workflow

### Branch Strategy

#### Branch Types
```bash
# Main branches
main          # Production-ready code
develop        # Integration branch for features

# Feature branches
feature/ICON-123-add-visual-similarity
feature/ICON-124-improve-cache-performance

# Hotfix branches
hotfix/ICON-125-fix-memory-leak
hotfix/ICON-126-security-patch

# Release branches
release/v1.0.0
release/v1.1.0

# Support branches
support/v1.0.x
support/v1.1.x
```

#### Branch Naming Convention
```
feature/ISSUE-ID-brief-description
hotfix/ISSUE-ID-brief-description
release/VERSION-NUMBER
support/VERSION-NUMBER
```

### Commit Guidelines

#### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
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

#### Scopes
- `analysis`: Icon analysis service
- `api`: API service
- `web`: Web frontend
- `cli`: Command-line interface
- `tests`: Test files
- `docs`: Documentation
- `build`: Build system

#### Examples
```bash
feat(analysis): add visual similarity detection
fix(api): handle file upload errors properly
docs(readme): update development setup instructions
style(icons): format SVG processing code
refactor(processing): optimize batch processing algorithm
perf(cache): improve cache hit ratio
test(analysis): add unit tests for edge cases
chore(deps): update dependencies
```

### Pull Request Process

#### PR Template
```markdown
## Description
Brief description of changes made

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Checklist
- [ ] My code follows the project coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules
- [ ] I have checked my code and corrected any misspellings

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Updated README files
- [ ] Updated API documentation
- [ ] Added inline comments for complex logic

## Issue References
Closes #ISSUE-NUMBER
Related to #ISSUE-NUMBER
```

#### Review Process
1. **Automated Checks**
   - Code linting passes
   - Type checking passes
   - Unit tests pass
   - Integration tests pass
   - Build succeeds

2. **Code Review**
   - At least one team member review
   - Code quality standards met
   - Security considerations addressed
   - Performance implications considered

3. **Testing Review**
   - Test coverage adequate
   - Test cases comprehensive
   - Edge cases covered

4. **Documentation Review**
   - README updated if necessary
   - API documentation updated
   - Inline comments appropriate

5. **Approval and Merge**
   - All feedback addressed
   - Approval from required reviewers
   - CI/CD pipeline passes
   - Merge to target branch

---

## Code Review Guidelines

### Review Checklist

#### Code Quality
- [ ] Code follows project coding standards
- [ ] TypeScript configuration is strict
- [ ] No unused variables or imports
- [ ] Proper error handling implemented
- [ ] Code is well-structured and readable
- [ ] Complex logic has appropriate comments
- [ ] Naming conventions followed
- [ ] Magic numbers and strings replaced with constants

#### Security
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Authentication and authorization
- [ ] Sensitive data not exposed
- [ ] Proper error messages (no sensitive info)
- [ ] Secure file handling
- [ ] API rate limiting

#### Performance
- [ ] Efficient algorithms used
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate
- [ ] Memory usage optimized
- [ ] Async operations used correctly
- [ ] Large files handled efficiently
- [ ] Resource cleanup implemented
- [ ] Performance considerations documented

#### Testing
- [ ] Unit tests cover all functionality
- [ ] Edge cases tested
- [ ] Error conditions tested
- [ ] Integration tests included
- [ ] Test assertions are meaningful
- [ ] Mocks used appropriately
- [ ] Test names are descriptive
- [ ] Tests are independent and repeatable

#### Documentation
- [ ] JSDoc comments for public APIs
- [ ] Complex logic explained
- [ ] README updated if necessary
- [ ] API documentation updated
- [ ] Inline comments for unclear code
- [ ] Examples provided where helpful
- [ ] Dependencies documented
- [ ] Breaking changes documented

### Review Best Practices

#### Providing Feedback
- **Be constructive:** Focus on the code, not the person
- **Be specific:** Provide clear, actionable feedback
- **Be respectful:** Use professional and courteous language
- **Explain reasoning:** Help the author understand your perspective
- **Suggest solutions:** Offer alternative approaches when possible

#### Example Feedback
```
**Good Feedback:**
"The `analyzeIcon` function could benefit from input validation. Consider adding a check for empty or malformed SVG content to prevent errors downstream. You could use the `validateSvgContent` utility function we already have."

**Poor Feedback:**
"This code is wrong and will break."
```

#### Common Issues to Look For

#### TypeScript Issues
- Missing type annotations
- Use of `any` type
- Incorrect null handling
- Missing return type annotations
- Improper generic usage

#### React Issues
- Missing dependency arrays in useEffect
- Inline function definitions in render
- Missing key props in lists
- Improper state updates
- Missing cleanup in useEffect

#### Node.js Issues
- Callback hell (use async/await)
- Unhandled promise rejections
- Memory leaks (event listeners, timers)
- Blocking the event loop
- Missing error handling

#### Database Issues
- SQL injection vulnerabilities
- Missing indexes
- N+1 query problems
- Connection leaks
- Transaction handling

---

*This coding standards document will be updated as the project evolves. Please check the repository for the latest version and suggest improvements.*