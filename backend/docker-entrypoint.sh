#!/bin/bash
set -e

wait_for_db() {
    if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
        echo "Database configuration not found, skipping database wait..."
        return 0
    fi

    echo "Waiting for database at ${DB_HOST}:${DB_PORT:-5432}..."
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if python - <<EOF
import sys
import psycopg2

try:
    conn = psycopg2.connect(
        host="${DB_HOST}",
        port="${DB_PORT:-5432}",
        user="${DB_USER}",
        password="${DB_PASSWORD}",
        dbname="${DB_NAME}",
        connect_timeout=2,
    )
    conn.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
EOF
        then
            echo "Database is up!"
            return 0
        fi

        attempt=$((attempt + 1))
        echo "Database is unavailable - attempt $attempt/$max_attempts - sleeping..."
        sleep 2
    done

    echo "Warning: Could not connect to database after $max_attempts attempts"
    return 1
}

wait_for_db || echo "Continuing without database connection..."

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Running migrations..."
    python manage.py migrate --noinput || echo "Migration failed, continuing..."
else
    echo "Skipping migrations (RUN_MIGRATIONS=false)"
fi

if [ "${COLLECT_STATIC:-false}" = "true" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput || echo "Static files collection failed, continuing..."
else
    echo "Skipping collectstatic (COLLECT_STATIC=false)"
fi

echo "Starting application..."
exec "$@"