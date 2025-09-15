set -e

for i in $(seq 1 120); do
  if node apps/backend/dist/migrate.js; then
    echo "Migrations applied successfully!"
    exec node apps/backend/dist/main.js
  fi
  echo "Migrations failed, retrying in 2s ($i/120)..."
  sleep 2
done