// MSW server shared by all tests: no real network; a request without a handler fails the test.
import { setupServer } from 'msw/node';
import { companyOk } from './company-handlers';

// The app shell header reads the company on every signed-in screen, so that one request always has an answer.
export const server = setupServer(companyOk());
