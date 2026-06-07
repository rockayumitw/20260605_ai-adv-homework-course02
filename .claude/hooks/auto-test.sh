#!/bin/bash
# After editing src/** or tests/**, auto-run npm test

FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"
if [[ -z "$FILE" ]]; then
  exit 0
fi

if [[ "$FILE" == */src/* ]] || [[ "$FILE" == */tests/* ]]; then
  echo "原始碼已更新，執行測試..."
  cd "$(dirname "$0")/../.." && npm test 2>&1
fi

exit 0
