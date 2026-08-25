# Testing Guide for ScholarMarket

This document outlines the comprehensive testing infrastructure for ScholarMarket, including unit tests, integration tests, component tests, and visual regression tests.

## Table of Contents

1. [Testing Infrastructure Overview](#testing-infrastructure-overview)
2. [Setup and Installation](#setup-and-installation)
3. [Running Tests](#running-tests)
4. [Test Types](#test-types)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)

## Testing Infrastructure Overview

ScholarMarket uses a multi-layered testing approach:

- **Unit Tests**: Using Vitest for fast unit test execution
- **Component Tests**: React Testing Library for component behavior
- **Integration Tests**: MongoDB integration with mongodb-memory-server for real database testing
- **API Mocking**: Mock Service Worker (MSW) for Pinata API and external services
- **Visual Regression Tests**: Playwright for visual regression and end-to-end testing

### Technology Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit/Component | Vitest + React Testing Library | Fast test execution, component testing |
| Database | mongodb-memory-server | In-memory MongoDB for integration tests |
| API Mocking | Mock Service Worker (MSW) | Intercept and mock external API calls |
| E2E/Visual | Playwright | End-to-end and visual regression testing |
| Accessibility | jest-axe | Automated accessibility checking |

## Setup and Installation

All testing dependencies are included in `package.json`. If you haven't installed them yet:

```bash
npm install
```

Key dependencies installed:
- `vitest@^4.1.8` - Fast unit test framework
- `@testing-library/react@^16.3.2` - Component testing
- `mongodb-memory-server@^9.4.1` - In-memory MongoDB
- `msw@^2.1.5` - Mock Service Worker
- `playwright@^1.45.0` - Visual regression testing
- `jest-axe@^10.0.0` - Accessibility testing

## Running Tests

### Run All Tests

```bash
npm run test:all
```

This runs all test suites: unit, integration, visual, and contract tests.

### Unit and Component Tests (Vitest)

```bash
# Run all Vitest tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage

# Run only component tests
npm run test:components

# Run only component tests in watch mode
npm run test:components:watch
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run integration tests in watch mode
npm run test:integration:watch

# Run specific integration test file
npm run test:integration -- mongodb.integration.test.js
```

Available integration tests:
- **mongodb.integration.test.js** - MongoDB operations with real in-memory database
- **pinata-mocking.test.js** - Pinata API mocking and upload scenarios
- **upload-api.test.js** - Complete upload workflow with mocks

### Visual Regression Tests (Playwright)

```bash
# Run all visual regression tests
npm run test:visual

# Run in debug mode (opens Playwright Inspector)
npm run test:visual:debug

# Run tests headed (see browser window)
npx playwright test test/visual --headed

# Run specific browser
npx playwright test test/visual --project=chromium
```

Available browsers:
- `chromium` - Desktop Chrome
- `firefox` - Desktop Firefox
- `webkit` - Desktop Safari
- `Mobile Chrome` - Mobile viewport
- `Mobile Safari` - iPhone viewport

### Contract and Backend Tests

```bash
# Run Hardhat contract tests
npm run test:contracts

# Run Node.js backend tests
npm run test:backend
```

## Test Types

### 1. MongoDB Integration Tests (`test/integration/mongodb.integration.test.js`)

Tests real MongoDB operations using an in-memory database instance.

**Features:**
- Full CRUD operations on materials, users, purchases collections
- Complex aggregation pipelines for analytics
- Index creation and verification
- Schema validation testing
- Pagination and sorting
- Text search capabilities
- Data cleanup between tests

**Example:**
```javascript
describe('MongoDB Integration Tests', () => {
  it('should insert a material with required fields', async () => {
    const materials = db.collection('materials');
    const doc = {
      title: 'Introduction to React',
      description: 'Learn the fundamentals',
      category: 'Web Development',
      price: 29.99,
      createdAt: new Date(),
    };

    const result = await materials.insertOne(doc);
    expect(result.insertedId).toBeDefined();
  });
});
```

**Key Test Suites:**
- Materials Collection (CRUD, search, indexing)
- Complex Aggregation Queries (analytics pipelines)
- Index Creation and Performance
- Schema Validation
- Data Cleanup and Isolation

### 2. Pinata API Mocking Tests (`test/integration/pinata-mocking.test.js`)

Tests Pinata IPFS integration without making real network requests using MSW.

**Features:**
- Mock successful and failed file uploads
- Mock pin status checking
- Mock unpin operations
- Error handling (auth, rate limits, timeouts)
- Retry logic simulation
- Pagination support

**Example:**
```javascript
it('should mock successful file upload to Pinata', async () => {
  const formData = new FormData();
  const blob = new Blob(['test file'], { type: 'application/pdf' });
  formData.append('file', blob, 'test.pdf');

  const response = await fetch(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer test-jwt-token' },
      body: formData,
    }
  );

  const data = await response.json();
  expect(data.IpfsHash).toBe('QmTestHash123456789');
});
```

**Key Test Suites:**
- File Upload Mocking (success, auth errors, size limits)
- Pin Status Checking (pagination, empty results)
- Unpin Operations (success, hash not found)
- Error Handling (timeouts, malformed responses)
- Integration with Application Code (retry logic)

### 3. Upload API Tests (`test/integration/upload-api.test.js`)

Tests the complete upload workflow with Pinata mocking.

**Features:**
- File and thumbnail upload
- File validation before upload
- Error formatting for user display
- Duplicate file detection
- Retry logic with exponential backoff
- Response processing

### 4. Component Tests

**WalletButton Tests** (`src/components/__tests__/WalletBtn.test.jsx`)

Tests all wallet connection states and user interactions.

**Features:**
- Idle, Connecting, Connected, Locked states
- Unsupported network and Error states
- Address truncation and display
- Click handlers
- Accessibility compliance (axe)
- State transitions
- Keyboard navigation

**Example:**
```javascript
it('should render connect button in idle state', () => {
  useWallet.mockReturnValue({
    state: { status: WalletStatus.Idle },
    connect: mockConnect,
    disconnect: mockDisconnect,
  });

  render(<WalletButton />);
  const button = screen.getByRole('button', { name: /connect wallet/i });
  expect(button).toBeInTheDocument();
});
```

**Test Coverage:**
- Rendering all 8 wallet states
- User interactions (clicks, focus)
- Address display and truncation
- Accessibility compliance (axe, WCAG)
- State transitions
- Edge cases

**Other Component Tests:**
- `Modal.test.jsx` - Modal accessibility and interactions
- `ThemeToggle.test.jsx` - Theme switching functionality

### 5. Visual Regression Tests (`test/visual/`)

Playwright-based visual regression testing for pixel-perfect UI consistency.

**Features:**
- Screenshot comparisons across browsers (Chrome, Firefox, Safari)
- Mobile viewport testing
- Responsive design verification
- Theme consistency (light/dark)
- Focus indicator visibility
- Animation and motion testing

**Test Files:**
- `core-components.spec.js` - Header, Material Card, Checkout Modal
- `accessibility.spec.js` - Focus indicators, contrast, spacing

**Example:**
```javascript
test('should match header snapshot on desktop', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header').first();
  await expect(header).toHaveScreenshot('header-desktop.png');
});
```

**Running Visual Tests:**
```bash
# First baseline run (creates snapshots)
npm run test:visual

# Update snapshots after intentional changes
npx playwright test --update-snapshots

# Run with browser visible
npx playwright test --headed

# Debug mode with inspector
npm run test:visual:debug
```

## Writing Tests

### Vitest Unit Tests

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
  let mockFn;

  beforeEach(() => {
    mockFn = vi.fn();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });

  it('should handle errors', async () => {
    await expect(asyncFunction()).rejects.toThrow('error message');
  });
});
```

### React Component Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

describe('ComponentName', () => {
  it('should render and handle interaction', async () => {
    render(<MyComponent />);

    const button = screen.getByRole('button', { name: /click/i });
    await userEvent.click(button);

    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('should pass accessibility checks', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### MongoDB Integration Tests

```javascript
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupDatabase, teardownDatabase, clearDatabase } from '../mongodb-setup.js';

let db;

beforeAll(async () => {
  const setup = await setupDatabase();
  db = setup.db;
});

afterAll(async () => {
  await teardownDatabase();
});

beforeEach(async () => {
  await clearDatabase(db);
});

describe('Database Operations', () => {
  it('should insert and retrieve documents', async () => {
    const collection = db.collection('items');
    const doc = { name: 'test', value: 42 };

    const result = await collection.insertOne(doc);
    const found = await collection.findOne({ _id: result.insertedId });

    expect(found.value).toBe(42);
  });
});
```

### MSW Mocking

```javascript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('https://api.example.com/upload', () => {
    return HttpResponse.json({ success: true });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Integration', () => {
  it('should handle successful response', async () => {
    const response = await fetch('https://api.example.com/upload', {
      method: 'POST',
    });
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should handle error response', async () => {
    server.use(
      http.post('https://api.example.com/upload', () => {
        return HttpResponse.json(
          { error: 'Failed' },
          { status: 400 }
        );
      })
    );

    const response = await fetch('https://api.example.com/upload', {
      method: 'POST',
    });
    expect(response.status).toBe(400);
  });
});
```

### Playwright Visual Tests

```javascript
import { test, expect } from '@playwright/test';

test.describe('Component Appearance', () => {
  test('should match snapshot', async ({ page }) => {
    await page.goto('/component-page');

    const component = page.locator('.my-component');

    // First run: creates snapshot
    // Subsequent runs: compares against snapshot
    await expect(component).toHaveScreenshot('component.png');
  });

  test('should look correct on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const main = page.locator('main');
    await expect(main).toHaveScreenshot('mobile.png');
  });
});
```

## Best Practices

### 1. Test Organization

```
src/
  components/
    __tests__/
      ComponentName.test.jsx
test/
  integration/
    mongodb.integration.test.js
    api.integration.test.js
  visual/
    components.spec.js
  handlers/
    api.handlers.js
  setup.js
```

### 2. Naming Conventions

- **Test files**: `*.test.js`, `*.test.jsx`, `*.spec.js`
- **Test suites**: `describe('Feature/Component Name', ...)`
- **Test cases**: `it('should do X when Y happens', ...)`

### 3. Mocking Strategy

- **External APIs**: Use MSW for consistency
- **Hooks**: Use vi.mock() for dependency injection
- **Database**: Use mongodb-memory-server for integration tests
- **Functions**: Use vi.fn() for tracking calls

### 4. Accessibility Testing

Always include accessibility checks:

```javascript
import { axe } from 'jest-axe';

it('should have no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 5. Testing Patterns

**Arrange-Act-Assert (AAA):**
```javascript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

**Testing User Interactions:**
```javascript
import userEvent from '@testing-library/user-event';

it('should handle form submission', async () => {
  const user = userEvent.setup();
  render(<Form />);

  await user.type(screen.getByLabelText(/name/i), 'John');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### 6. Performance Considerations

- **Keep tests fast**: Use mocks instead of real services
- **Parallel execution**: Vitest runs tests in parallel by default
- **Cleanup**: Always clean up resources (databases, servers, timers)
- **Snapshots**: Use visual snapshots sparingly for components

### 7. CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm run test:all

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Troubleshooting

### MongoDB Tests Hanging

Ensure cleanup functions are called:
```javascript
afterAll(async () => {
  await teardownDatabase(); // Don't forget!
});
```

### MSW Not Intercepting Requests

- Ensure server is started in `beforeAll`
- Verify URL matches exactly (protocol, domain, path)
- Use `server.resetHandlers()` in `afterEach`

### Visual Test Snapshots Failing

1. Review the diff in HTML report: `npx playwright show-report`
2. Update intentionally changed snapshots: `npx playwright test --update-snapshots`
3. Commit updated snapshots to version control

### Accessibility Violations in Tests

Run jest-axe with detailed output:
```javascript
const results = await axe(container);
console.log(results.violations);
```

Then fix the violations in component code before updating test.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Mock Service Worker](https://mswjs.io/)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass: `npm run test:all`
3. Check coverage: `npm run test:coverage`
4. Update visual snapshots if UI changed: `npx playwright test --update-snapshots`
5. Commit test files with feature code
