// MSW server shared by all tests: no real network; a request without a handler fails the test.
import { setupServer } from 'msw/node';

export const server = setupServer();
