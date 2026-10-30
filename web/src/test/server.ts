// MSW server shared by all tests: no real network; a request without a handler fails the test.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { companyOk } from './company-handlers';
import { quickEmpty } from './dashboard-approval-handlers';
import { expiryEmpty, leaveTodayEmpty } from './dashboard-attention-handlers';
import { tilesApi } from './dashboard-handlers';
import { headcountEmpty } from './dashboard-headcount-handlers';
import { teamEmpty } from './dashboard-team-handlers';
import { orgUnitOptionsOk } from './org-unit-handlers';
import { overviewFor } from './resource-handlers';

const overviewOk = () => http.get('*/api/resources/overview', () => HttpResponse.json(overviewFor(null)));

// The app shell header reads the company on every signed-in screen, and the employee screens read the units to
// filter and pick, and Tổng quan is where a signed-in user lands, so these requests always have an answer (the
// overview, the headcount, the team, the leave of the day and the expiry list are what the blocks of Tổng quan read).
export const server = setupServer(companyOk(), orgUnitOptionsOk(), tilesApi().handler, quickEmpty(), headcountEmpty(), overviewOk(), teamEmpty(), leaveTodayEmpty(), expiryEmpty());
