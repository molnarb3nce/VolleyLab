declare global {
  interface Window {
    __VOLLEYLAB_API_URL__?: string;
  }
}

function apiBaseUrl(): string {
  const runtime = window.__VOLLEYLAB_API_URL__?.trim();
  if (runtime) return runtime.replace(/\/+$/, '');
  const raw = import.meta.env.VITE_API_URL;
  const base =
    typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : 'http://localhost:3000';
  return base.replace(/\/+$/, '');
}

function getApiBaseUrl(): string {
  return apiBaseUrl();
}
let token: string | null = null;
let unauthorizedHandler: () => void = () => {};

export const setToken = (value: string | null) => {
  token = value;
};
export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(getApiBaseUrl() + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (/^\s*</.test(text)) {
        throw new Error(
          'Got a web page instead of API JSON. On Railway web service set API_URL to your backend URL (not this site), redeploy, and check /runtime-config.js shows that URL.',
        );
      }
      throw new Error('Server returned a non-JSON response.');
    }
  }
  if (!res.ok) {
    // A 401 on a protected call means the token is gone or expired (login errors stay visible).
    if (res.status === 401 && token) unauthorizedHandler();
    const body = data as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join('; ') : body?.message;
    throw new Error(message ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
};
