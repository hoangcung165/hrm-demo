// MSW handlers for the org structure API ("## API contract" on issue #5).
import { http, HttpResponse } from 'msw';
import type { OrgStructure } from '@/features/org-unit/api';
import { problem } from './auth-handlers';
import { orgStructure } from './org-unit-fixtures';

export const orgUnitsOk = (structure: OrgStructure = orgStructure()) => http.get('*/api/org-units', () => HttpResponse.json(structure));
export const orgUnitsDenied = () => http.get('*/api/org-units', () => problem(403, 'auth.forbidden'));
export const orgUnitsFail = () => http.get('*/api/org-units', () => problem(500, 'error.unknown'));
