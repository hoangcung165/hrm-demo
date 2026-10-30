// MSW server shared by all tests: no real network; a request without a handler fails the test.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { companyOk } from './company-handlers';
import { quickEmpty } from './dashboard-approval-handlers';
import { tilesApi } from './dashboard-handlers';
import { headcountEmpty } from './dashboard-headcount-handlers';
import { orgUnitOptionsOk } from './org-unit-handlers';
import { overviewFor } from './resource-handlers';

const overviewOk = () => http.get('*/api/resources/overview', () => HttpResponse.json(overviewFor(null)));

// The app shell header reads the company on every signed-in screen, and the employee screens read the units to
// filter and pick, and Tổng quan is where a signed-in user lands, so these requests always have an answer (the
// overview and the headcount are what the resource and headcount blocks of Tổng quan read).
export const server = setupServer(companyOk(), orgUnitOptionsOk(), tilesApi().handler, quickEmpty(), headcountEmpty(), overviewOk());
