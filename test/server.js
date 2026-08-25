import { setupServer } from 'msw/node';
import { pinataHandlers } from './handlers/pinata.handlers.js';

// Create MSW server with all handlers
export const server = setupServer(...pinataHandlers);

// Enable API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any request handlers we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());
