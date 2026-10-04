// MSW handlers for the auth API, shaped like the backend's responses (contracts on issues #44 and #45).
import { http, HttpResponse } from 'msw';

export const ME = { id: '11111111-1111-1111-1111-111111111111', email: 'mai.tran@congty.vn', roles: ['HR'], dataScope: 'COMPANY', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'ORG_VIEW', 'ORG_EDIT'] };

export const problem = (status: number, code: string, extra: object = {}) =>
  HttpResponse.json({ status, code, title: 'Error', ...extra }, { status, headers: { 'Content-Type': 'application/problem+json' } });

export const tokens = (accessToken = 'access-1') => HttpResponse.json({ accessToken, tokenType: 'Bearer', expiresIn: 900 });

export const meOk = () => http.get('*/api/me', () => HttpResponse.json(ME));
export const refreshOk = (accessToken = 'access-refreshed') => http.post('*/api/auth/refresh', () => tokens(accessToken));
export const refreshFails = () => http.post('*/api/auth/refresh', () => problem(401, 'auth.refresh_token_invalid'));
