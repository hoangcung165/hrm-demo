// MSW server shared by all tests: no real network; a request without a handler fails the test.
import { setupServer } from 'msw/node';
import { companyOk } from './company-handlers';
import { orgUnitOptionsOk } from './org-unit-handlers';

// The app shell header reads the company on every signed-in screen, and the employee screens read the units to
// filter and pick, so these requests always have an answer.
export const server = setupServer(companyOk(), orgUnitOptionsOk());
