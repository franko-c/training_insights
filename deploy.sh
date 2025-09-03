#!/usr/bin/env bash

# Automated build, commit, push, and Railway deploy script
# Usage: ./deploy.sh

set -euo pipefail

# Build frontend
echo "==> Building frontend (Vite)..."
npm run build

# Commit built assets
echo "==> Staging build artifacts..."
git add dist index.html netlify.toml || true

echo "==> Committing build assets..."
git diff --cached --quiet || git commit -m "chore: build assets"

# Push to remote (current branch) and also update master for Netlify

# Deploy backend to Railway
echo ">==> Deploying backend via Railway CLI..."
cd zwift_api_client
railway up
cd -

echo "==> Deployment complete!"
# Usage: ./deploy.sh [prod|preview]
# Requires NETLIFY_SITE_ID env var for Netlify CLI
TARGET=${1:-preview}

if [ "$TARGET" = "prod" ]; then
	echo "==> Deploying frontend to Netlify production site $NETLIFY_SITE_ID..."
	netlify deploy --site "$NETLIFY_SITE_ID" --prod --dir=dist --message "Prod deploy $(git rev-parse --short HEAD)"
else
	echo "==> Deploying frontend to Netlify preview site $NETLIFY_SITE_ID..."
	netlify deploy --site "$NETLIFY_SITE_ID" --dir=dist --message "Preview deploy $(git rev-parse --abbrev-ref HEAD)-$(git rev-parse --short HEAD)"
fi

echo "==> Deploying backend via Railway CLI..."
cd zwift_api_client
railway up
cd -

echo "==> Deployment complete!"
echo "==> Deployment complete!"
