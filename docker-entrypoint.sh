#!/bin/sh
set -e

echo "=== Nine Game Container Startup ==="

echo "Running database migrations..."
prisma migrate deploy 2>&1 || {
  echo "WARNING: prisma migrate deploy failed. Continuing — seed may create tables if needed."
}

echo "Seeding database..."
node docker-seed.mjs 2>&1 || echo "WARNING: Seeding skipped or failed (non-fatal)"

echo "Starting application on port ${PORT:-3000}..."
exec node server.js
