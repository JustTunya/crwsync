set -e

i=0
until node apps/backend/dist/migrate.js; do
  i=$((i+1))
  [ "$i" -ge 10 ] && echo "migrations failed after $i attempts" && exit 1
  echo "migrations failed, retrying in 5 seconds..."
  sleep 5
done

exec node apps/backend/dist/main.js