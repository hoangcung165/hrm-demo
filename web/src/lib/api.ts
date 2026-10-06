// Thin fetch layer for the backend API: ProblemDetail errors with `code`, in-memory access token,
// and one automatic refresh when the access token has expired (ADR 0001).

export type FieldError = { field: string; code: string };

/** A failed API call. `code` is the backend's stable error key, translated under `error.<code>`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];
  /** The whole problem body, for the extra fields some codes carry (e.g. `holder` of `org_unit.code_taken`). */
  readonly details: Readonly<Record<string, unknown>>;

  constructor(status: number, code: string, fieldErrors: FieldError[] = [], details: Record<string, unknown> = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }
}

type AccessTokenResponse = { accessToken: string; tokenType: string; expiresIn: number };

// Kept in memory only, never in localStorage; a page reload gets a new one through the refresh cookie.
let accessToken: string | null = null;
let refreshing: Promise<void> | null = null;
let onSessionExpired: (reason?: SessionEndReason) => void = () => {};

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Why a session ended, when the backend said so: the Account was locked. Otherwise it just expired or was revoked. */
export type SessionEndReason = 'locked';
const LOCKED = 'auth.account_locked';
export const isAccountLocked = (error: unknown) => error instanceof ApiError && error.code === LOCKED;

/** Called when the session ends while the app believed it was signed in: a refresh failed, or the Account is locked. */
export function setSessionExpiredHandler(handler: (reason?: SessionEndReason) => void) {
  onSessionExpired = handler;
}

export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Sent as JSON; a `FormData` goes out as `multipart/form-data` (file uploads). */
  body?: unknown;
  headers?: Record<string, string>;
  /** Send the access token and refresh once on 401. Off for login, refresh, forgot and reset. */
  auth?: boolean;
};

async function send(path: string, { method = 'GET', body, headers, auth = true }: ApiOptions): Promise<Response> {
  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  // For FormData the browser sets the Content-Type itself, with the multipart boundary.
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) requestHeaders['Content-Type'] = 'application/json';
  if (auth && accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;
  return fetch(path, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    credentials: 'include',
  });
}

async function toError(response: Response): Promise<ApiError> {
  let code = 'unknown';
  let fieldErrors: FieldError[] = [];
  let details: Record<string, unknown> = {};
  try {
    const problem = (await response.json()) as { code?: string; errors?: FieldError[] };
    code = problem.code ?? code;
    fieldErrors = problem.errors ?? [];
    details = problem;
  } catch {
    // Not JSON (proxy error page, empty body): keep the generic code.
  }
  return new ApiError(response.status, code, fieldErrors, details);
}

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<void> {
  refreshing ??= (async () => {
    const response = await send('/api/auth/refresh', { method: 'POST', auth: false });
    if (!response.ok) {
      accessToken = null;
      throw await toError(response);
    }
    accessToken = ((await response.json()) as AccessTokenResponse).accessToken;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T = void>(path: string, options: ApiOptions = {}): Promise<T> {
  let response = await send(path, options);
  if (response.status === 401 && options.auth !== false && accessToken) {
    // GET /api/me says so when the Account was locked, also while the access token is still valid. No refresh can
    // help then (the lock revoked the refresh token): the session ends, and the reason is known.
    const refused = await toError(response);
    if (isAccountLocked(refused)) {
      accessToken = null;
      onSessionExpired('locked');
      throw refused;
    }
    try {
      await refreshAccessToken();
    } catch (error) {
      // A revoked refresh token says only that it is invalid: the reason stays unknown unless the backend names it.
      onSessionExpired(isAccountLocked(error) ? 'locked' : undefined);
      throw new ApiError(401, 'auth.unauthenticated');
    }
    response = await send(path, options);
  }
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
