#!/bin/sh
# Build the site into dist/ (tracked in git), commit dist/ and push.
# Production (Plesk on ps.kz) pulls the repo and serves dist/ as the document root.
# Only dist/ is committed here; commit source changes separately.
set -e
cd "$(dirname "$0")/.."

npm run build
git add -A dist
if git diff --cached --quiet -- dist; then
  echo "dist/ unchanged, nothing to commit"
else
  git commit -m "build: update dist $(date '+%Y-%m-%d %H:%M')" -- dist
fi
git push
