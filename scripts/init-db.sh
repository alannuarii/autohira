#!/usr/bin/env bash
set -e

# Load .env jika file tersedia di root direktori dan variabel belum diset
if [ -f .env ]; then
  while IFS='=' read -r key val || [ -n "$key" ]; do
    # Abaikan komentar dan baris kosong
    if [[ ! "$key" =~ ^\s*# ]] && [[ -n "$key" ]]; then
      key=$(echo "$key" | xargs)
      val=$(echo "$val" | xargs)
      if [ -z "${!key}" ]; then
        export "$key=$val"
      fi
    fi
  done < .env
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
TARGET_DB="${DB_NAME:-db_autohira}"
ADMIN_DB="${DB_ADMIN_DATABASE:-postgres}"

echo "[AutoHIRA] Memeriksa status database '$TARGET_DB' di $DB_HOST:$DB_PORT..."

if command -v psql >/dev/null 2>&1; then
  export PGPASSWORD="$DB_PASSWORD"
  DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ADMIN_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '$TARGET_DB';" 2>/dev/null || true)

  if [ "$DB_EXISTS" = "1" ]; then
    echo "[AutoHIRA] Database '$TARGET_DB' SUDAH ADA. Melewati proses pembuatan database."
  else
    echo "[AutoHIRA] Database '$TARGET_DB' BELUM DITEMUKAN. Membuat database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ADMIN_DB" -c "CREATE DATABASE \"$TARGET_DB\";"
    echo "[AutoHIRA] Database '$TARGET_DB' BERHASIL DIBUAT."
  fi
elif command -v node >/dev/null 2>&1; then
  echo "[AutoHIRA] psql CLI tidak ditemukan, beralih menggunakan script Node.js..."
  node "$(dirname "$0")/init-db.mjs"
else
  echo "[AutoHIRA ERROR] psql maupun node tidak ditemukan di sistem!" >&2
  exit 1
fi
