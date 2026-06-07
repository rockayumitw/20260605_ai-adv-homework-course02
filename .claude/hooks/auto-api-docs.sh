#!/bin/bash
# After editing src/routes/**, auto-regenerate openapi.json

FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"
if [[ -z "$FILE" ]]; then
  exit 0
fi

if [[ "$FILE" == */src/routes/* ]]; then
  echo "路由檔案已更新，重新產生 OpenAPI 文件..."
  cd "$(dirname "$0")/../.." && npm run openapi 2>&1 || echo "openapi 產生失敗，請手動執行 npm run openapi" >&2
fi

exit 0
