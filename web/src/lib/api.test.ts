import { http, HttpResponse } from 'msw';
import { problem, tokens } from '@/test/auth-handlers';
import { server } from '@/test/server';
import { api, ApiError, setAccessToken, setSessionExpiredHandler } from './api';

describe('api', () => {
  it('sends the access token and returns JSON', async () => {
    setAccessToken('access-1');
    server.use(http.get('*/api/me', ({ request }) => HttpResponse.json({ auth: request.headers.get('Authorization') })));
    await expect(api('/api/me')).resolves.toEqual({ auth: 'Bearer access-1' });
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    setAccessToken('expired');
    let refreshCalls = 0;
    server.use(
      http.get('*/api/me', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer access-2' ? HttpResponse.json({ ok: true }) : problem(401, 'auth.unauthenticated'),
      ),
      http.post('*/api/auth/refresh', () => {
        refreshCalls += 1;
        return tokens('access-2');
      }),
    );
    const results = await Promise.all([api('/api/me'), api('/api/me')]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
  });

  it('reports an expired session when the refresh fails', async () => {
    setAccessToken('expired');
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    server.use(
      http.get('*/api/me', () => problem(401, 'auth.unauthenticated')),
      http.post('*/api/auth/refresh', () => problem(401, 'auth.refresh_token_expired')),
    );
    await expect(api('/api/me')).rejects.toMatchObject({ status: 401, code: 'auth.unauthenticated' });
    expect(expired).toHaveBeenCalledOnce();
    setSessionExpiredHandler(() => {});
  });

  it('turns a ProblemDetail into an ApiError with code and field errors, without refreshing for public calls', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        problem(400, 'validation.invalid', { errors: [{ field: 'email', code: 'Email' }] }),
      ),
    );
    const error = await api('/api/auth/login', { method: 'POST', body: {}, auth: false }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'validation.invalid', fieldErrors: [{ field: 'email', code: 'Email' }] });
  });

  it('returns nothing for 204', async () => {
    server.use(http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })));
    await expect(api('/api/auth/logout', { method: 'POST', auth: false })).resolves.toBeUndefined();
  });
});
