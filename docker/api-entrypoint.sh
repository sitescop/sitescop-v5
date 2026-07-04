#!/bin/sh
set -e
cd /app/apps/api
echo "[api] Running database migrations..."
npx prisma migrate deploy
echo "[api] Starting SiteScop API..."
exec node dist/index.js
