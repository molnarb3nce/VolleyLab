function normalizeOrigin(value: string): string {
  return value.replace(/^["']|["']$/g, '').trim().replace(/\/+$/, '');
}

/** Comma-separated list in CORS_ORIGIN or FRONTEND_URL (Railway-friendly). */
export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL;
  if (raw?.trim()) {
    return raw
      .split(',')
      .map(normalizeOrigin)
      .filter(Boolean);
  }
  return ['http://localhost:5173'];
}
