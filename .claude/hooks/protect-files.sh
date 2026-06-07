#!/bin/bash
# Blocks editing sensitive files: .env, *.sqlite, *.lock, package-lock.json

FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"
if [[ -z "$FILE" ]]; then
  exit 0
fi

BASENAME="$(basename "$FILE")"

BLOCKED_NAMES=(".env" "package-lock.json")
BLOCKED_PATTERNS=("*.sqlite" "*.sqlite-wal" "*.sqlite-shm" "*.sqlite3" "*.lock")

for name in "${BLOCKED_NAMES[@]}"; do
  if [[ "$BASENAME" == "$name" ]]; then
    echo "ERROR: 禁止編輯敏感檔案: $FILE" >&2
    exit 1
  fi
done

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if [[ "$BASENAME" == $pattern ]]; then
    echo "ERROR: 禁止編輯敏感檔案: $FILE" >&2
    exit 1
  fi
done

exit 0
