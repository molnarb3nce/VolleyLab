const API = 'http://localhost:3000';

export const ROLES = ['SETTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'OPPOSITE', 'LIBERO'] as const;

export interface Player {
  id: number;
  name: string;
  jerseyNumber: number;
  role: string;
  isActive: boolean;
}
export interface Team {
  id: number;
  name: string;
  ownerId: number;
  players?: Player[];
  _count?: { players: number };
}

export type Call = <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>;

/** Creates a fetch wrapper that sends the token and throws the server's error message. */
export function makeCall(token: string | null, onLog: (line: string) => void): Call {
  return async <T,>(method: string, path: string, body?: unknown) => {
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
    onLog(`${method} ${path} -> ${res.status} ${text.slice(0, 200)}`);
    if (!res.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
      throw new Error(message ?? `HTTP ${res.status}`);
    }
    return data as T;
  };
}
