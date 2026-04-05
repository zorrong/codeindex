#!/bin/sh
# .git/hooks/post-commit
# Tự động chạy incremental update sau mỗi commit.
#
# Cách setup:
#   cp packages/cli/src/hooks/post-commit.sh .git/hooks/post-commit
#   chmod +x .git/hooks/post-commit

CODEINDEX_BIN="./node_modules/.bin/codeindex"

# Check codeindex có được install không
if [ ! -f "$CODEINDEX_BIN" ]; then
  echo "[codeindex] Skipping update — codeindex not found at $CODEINDEX_BIN"
  exit 0
fi

# Check index có tồn tại không (chưa init thì không update)
if [ ! -d ".index" ]; then
  echo "[codeindex] Skipping update — run 'codeindex index .' first to initialize"
  exit 0
fi

echo "[codeindex] Running incremental update..."
$CODEINDEX_BIN update

if [ $? -eq 0 ]; then
  echo "[codeindex] Index updated successfully"
else
  echo "[codeindex] Update failed — index may be stale, run 'codeindex update' manually"
fi

# Hook luôn exit 0 để không block commit
exit 0
