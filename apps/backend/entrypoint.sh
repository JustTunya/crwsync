set -e

for i in $(seq 1 120); do
  if ./node_modules/.bin/prisma migrate deploy --schema=apps/backend/prisma/schema.prisma; then
    echo "Migrations applied successfully!"
    exec node apps/backend/dist/main.js
  fi
  echo "Migrations failed, retrying in 2s ($i/120)..."
  sleep 2
done