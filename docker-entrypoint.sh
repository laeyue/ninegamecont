#!/bin/sh
set -e

echo "=== Nine Game Container Startup ==="

echo "Running database migration..."
node docker-migrate.mjs 2>&1 || {
  echo "WARNING: Migration failed. Continuing — app may not work correctly."
}

echo "Seeding database..."
node docker-seed.mjs 2>&1 || echo "WARNING: Seeding skipped or failed (non-fatal)"

echo "Starting application on port ${PORT:-3000}..."
exec node server.js
