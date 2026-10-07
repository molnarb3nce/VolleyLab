const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let token: string | null = null;
let unauthorizedHandler: () => void = () => {};

export const setToken = (value: string | null) => {
  token = value;
};
export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // A 401 on a protected call means the token is gone or expired (login errors stay visible).
    if (res.status === 401 && token) unauthorizedHandler();
    const message = Array.isArray(data?.message) ? data.message.join('; ') : data?.message;
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
