#!/bin/sh
# .git/hooks/post-commit
# Tự động chạy incremental update sau mỗi commit.
#
# Cách setup:
#   cp packages/cli/src/hooks/post-commit.sh .git/hooks/post-commit
#   chmod +x .git/hooks/post-commit

CODEI_BIN="./node_modules/.bin/codei"

# Check codei có được install không
if [ ! -f "$CODEI_BIN" ]; then
  echo "[codei] Skipping update — codei not found at $CODEI_BIN"
  exit 0
fi

# Check index có tồn tại không (chưa init thì không update)
if [ ! -d ".index" ]; then
  echo "[codei] Skipping update — run 'codei index .' first to initialize"
  exit 0
fi

echo "[codei] Running incremental update..."
$CODEI_BIN update

if [ $? -eq 0 ]; then
  echo "[codei] Index updated successfully"
else
  echo "[codei] Update failed — index may be stale, run 'codei update' manually"
fi

# Hook luôn exit 0 để không block commit
exit 0
