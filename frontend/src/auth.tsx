import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, onUnauthorized, setToken } from './api';

interface Session {
  token: string;
  user: { id: number; email: string };
}

interface AuthContextValue {
  session: Session | null;
  signIn: (mode: 'login' | 'register', email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>(null as never);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem('session');
    const parsed: Session | null = saved ? JSON.parse(saved) : null;
    setToken(parsed?.token ?? null); // before any child fetches data
    return parsed;
  });

  const store = (next: Session | null) => {
    setToken(next?.token ?? null);
    if (next) localStorage.setItem('session', JSON.stringify(next));
    else localStorage.removeItem('session');
    setSession(next);
  };

  const signIn: AuthContextValue['signIn'] = async (mode, email, password) => {
    const r = await api.post<{ accessToken: string; user: Session['user'] }>(`/auth/${mode}`, {
      email,
      password,
    });
    store({ token: r.accessToken, user: r.user });
  };

  useEffect(() => onUnauthorized(() => store(null)), []);

  return (
    <AuthContext.Provider value={{ session, signIn, signOut: () => store(null) }}>
      {children}
    </AuthContext.Provider>
  );
}
