import { http, HttpResponse } from 'msw';
import { problem, tokens } from '@/test/auth-handlers';
import { server } from '@/test/server';
import { api, ApiError, apiDownload, dispositionFileName, setAccessToken, setSessionExpiredHandler } from './api';

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
    expect(expired).toHaveBeenCalledExactlyOnceWith(undefined);
    setSessionExpiredHandler(() => {});
  });

  it('reports a locked Account without trying a refresh, and passes the reason on when the refresh says it', async () => {
    const ended = vi.fn();
    setSessionExpiredHandler(ended);
    let refreshCalls = 0;
    const refresh = (code: string) =>
      http.post('*/api/auth/refresh', () => {
        refreshCalls += 1;
        return problem(401, code);
      });
    setAccessToken('access-1');
    server.use(http.get('*/api/me', () => problem(401, 'auth.account_locked')), refresh('auth.refresh_token_invalid'));
    await expect(api('/api/me')).rejects.toMatchObject({ status: 401, code: 'auth.account_locked' });
    expect(ended).toHaveBeenLastCalledWith('locked');
    expect(refreshCalls).toBe(0);

    setAccessToken('expired');
    server.use(http.get('*/api/me', () => problem(401, 'auth.unauthenticated')), refresh('auth.account_locked'));
    await expect(api('/api/me')).rejects.toMatchObject({ status: 401, code: 'auth.unauthenticated' });
    expect(ended).toHaveBeenLastCalledWith('locked');
    expect(refreshCalls).toBe(1);
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

  it('sends FormData as multipart/form-data, not JSON', async () => {
    let received: { contentType: string | null; file: FormDataEntryValue | null } | undefined;
    server.use(
      http.put('*/api/company/logo', async ({ request }) => {
        received = { contentType: request.headers.get('Content-Type'), file: (await request.formData()).get('file') };
        return HttpResponse.json({ ok: true });
      }),
    );
    const body = new FormData();
    body.append('file', new File(['png-bytes'], 'logo.png', { type: 'image/png' }));
    await expect(api('/api/company/logo', { method: 'PUT', body })).resolves.toEqual({ ok: true });
    expect(received?.contentType).toMatch(/^multipart\/form-data; boundary=/);
    // The file name is not asserted: jsdom's File loses it on the way through Node's fetch; browsers send it.
    expect(received?.file).toMatchObject({ type: 'image/png', size: 9 });
  });

  it('downloads a file with the token after a refresh, named by Content-Disposition', async () => {
    setAccessToken('expired');
    server.use(
      http.get('*/api/employees/export', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer access-3'
          ? new HttpResponse(new Uint8Array([0x50, 0x4b]), { headers: { 'Content-Disposition': 'attachment; filename="nhan-vien-2026-10-08.xlsx"', 'X-Total-Count': '7' } })
          : problem(401, 'auth.unauthenticated'),
      ),
      http.post('*/api/auth/refresh', () => tokens('access-3')),
    );
    const file = await apiDownload('/api/employees/export');
    expect(file.fileName).toBe('nhan-vien-2026-10-08.xlsx');
    expect(file.headers.get('X-Total-Count')).toBe('7');
    expect(file.blob.size).toBe(2);
  });

  it('throws the problem of a failed download instead of returning it as a file', async () => {
    setAccessToken('access-1');
    server.use(http.get('*/api/employees/export', () => problem(400, 'export.too_many_rows', { limit: 5000, total: 5230 })));
    const error = await apiDownload('/api/employees/export').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'export.too_many_rows', details: { limit: 5000, total: 5230 } });
  });

  it('reads the file name of Content-Disposition, preferring the UTF-8 form', () => {
    expect(dispositionFileName('attachment; filename="mau-nhap-nhan-vien.xlsx"')).toBe('mau-nhap-nhan-vien.xlsx');
    expect(dispositionFileName('attachment; filename=a.xlsx')).toBe('a.xlsx');
    expect(dispositionFileName(`attachment; filename="nhan-vien.xlsx"; filename*=UTF-8''nh%C3%A2n-vi%C3%AAn.xlsx`)).toBe('nhân-viên.xlsx');
    expect(dispositionFileName('attachment')).toBeNull();
    expect(dispositionFileName(null)).toBeNull();
  });
});
