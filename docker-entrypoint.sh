#!/bin/sh
set -e

echo "=== Nine Game Container Startup ==="

# Wait for database to be reachable (DNS + TCP)
echo "Waiting for database..."
MAX_TRIES=30
TRIES=0
until node -e "const net=require('net');const s=net.connect(5432,'db',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "ERROR: Database not reachable after ${MAX_TRIES} attempts"
    exit 1
  fi
  echo "  DB not ready (attempt $TRIES/$MAX_TRIES)..."
  sleep 2
done
echo "Database is reachable!"

echo "Running database migration..."
node docker-migrate.mjs 2>&1 || {
  echo "WARNING: Migration failed. Continuing — app may not work correctly."
}

echo "Seeding database..."
node docker-seed.mjs 2>&1 || echo "WARNING: Seeding skipped or failed (non-fatal)"

echo "Starting application on port ${PORT:-3000}..."
exec node server.js
