set -e

for i in $(seq 1 120); do
  if pnpx prisma migrate deploy --config=apps/backend/prisma.config.ts; then
    echo "Migrations applied successfully!"
    exec node apps/backend/dist/main.js
  fi
  echo "Migrations failed, retrying in 3s ($i/120)..."
  sleep 3
done