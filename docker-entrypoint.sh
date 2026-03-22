#!/bin/bash
set -e

echo "[entrypoint] Running Prisma migrations..."
node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Starting server..."
exec node server.js
