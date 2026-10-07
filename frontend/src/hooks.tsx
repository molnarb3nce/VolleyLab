import { Alert } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { FormationsInfo } from './types';

/** Loads data when the dependencies change; `reload` refetches. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}

/** Runs user actions and keeps the last error message to show next to them. */
export function useAction() {
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return { error, run, clear: () => setError('') };
}

export function ErrorAlert({ error }: { error?: string }) {
  return error ? (
    <Alert severity="error" sx={{ my: 1 }}>
      {error}
    </Alert>
  ) : null;
}

let formationsCache: Promise<FormationsInfo> | undefined;

/** Formation templates from the backend (fetched once). */
export function useFormations(): FormationsInfo | undefined {
  const [info, setInfo] = useState<FormationsInfo>();
  useEffect(() => {
    formationsCache ??= api.get<FormationsInfo>('/formations');
    formationsCache.then(setInfo).catch(() => (formationsCache = undefined));
  }, []);
  return info;
}
