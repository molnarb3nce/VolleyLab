/** Comma-separated list in CORS_ORIGIN or FRONTEND_URL (Railway-friendly). */
export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL;
  if (raw?.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ['http://localhost:5173'];
}
