#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is not set. Add a Postgres DATABASE_URL reference on this service."
  exit 1
fi
if [ -z "$JWT_SECRET" ]; then
  echo "FATAL: JWT_SECRET is not set."
  exit 1
fi
if [ -z "$CORS_ORIGIN" ] && [ -z "$FRONTEND_URL" ]; then
  echo "WARN: CORS_ORIGIN (or FRONTEND_URL) is not set; only http://localhost:5173 is allowed."
fi

echo "Applying Prisma migrations..."
if ! npx prisma migrate deploy; then
  echo "FATAL: prisma migrate deploy failed. Check DATABASE_URL and that Postgres is running."
  exit 1
fi

echo "Starting NestJS on 0.0.0.0:${PORT:-3000}"
exec node dist/main.js
