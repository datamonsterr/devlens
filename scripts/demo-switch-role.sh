#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-$HOME/.devlens}"
DB="$DATA_DIR/db/data.sqlite"

if [ ! -f "$DB" ]; then
  echo "Database not found at $DB"
  echo "Start the app first (pnpm dev), then run this script."
  exit 1
fi

CURRENT=$(sqlite3 "$DB" "SELECT role FROM users WHERE clerkUserId = 'local-dev-manager';")

if [ "$CURRENT" = "manager" ]; then
  NEW="developer"
elif [ "$CURRENT" = "developer" ]; then
  NEW="manager"
else
  echo "Unknown current role: $CURRENT"
  exit 1
fi

sqlite3 "$DB" "UPDATE users SET role = '$NEW' WHERE clerkUserId = 'local-dev-manager';"

echo "Switched role: $CURRENT → $NEW"
echo "Refresh the dashboard to see the change."

if pgrep -f "next dev" > /dev/null 2>&1; then
  echo ""
  echo "App is running. Just refresh http://localhost:20262/dashboard"
fi
