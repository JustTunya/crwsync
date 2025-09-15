set -e

i=0
until node apps/backend/dist/migrate.js; do
  i=$((i+1))
  if [ "$i" -gt 10 ]; then
    echo "Postgres is still not available after 10 attempts, exiting."
    exit 1
  fi
  echo "Waiting for Postgres..."
  sleep 1
done

exec node apps/backend/dist/main.js