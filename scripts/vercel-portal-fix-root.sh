#!/usr/bin/env bash
# Set portal project Root Directory to empty (repo root) via Vercel API.
# Requires: VERCEL_TOKEN from https://vercel.com/account/tokens
set -e
if [ -z "$VERCEL_TOKEN" ]; then
  echo "Set VERCEL_TOKEN (from https://vercel.com/account/tokens) and run again."
  exit 1
fi
TEAM_SLUG="${VERCEL_TEAM:-tindeveloper}"
PROJECT_NAME="magicwizards-portal"
curl -s -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_NAME}?teamId=${TEAM_SLUG}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rootDirectory":null}' | head -20
echo ""
echo "If you see project JSON above, rootDirectory was cleared. Redeploy with: vercel --prod --yes"
