set -e

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Waiting for Postgres..."
  sleep 1
done

node apps/backend/dist/migrate.js
node apps/backend/dist/main.js