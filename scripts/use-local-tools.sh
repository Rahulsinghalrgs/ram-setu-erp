#!/usr/bin/env bash

export PATH="$PWD/.local/bin:$PWD/.local/npm-global/node_modules/.bin:$PWD/.local/node-v24.15.0-darwin-arm64/bin:$HOME/.bun/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

echo "Local ERP tools are ready in this shell."
echo "Node: $(node -v)"
echo "npm: $(npm -v)"
echo "pnpm: $(pnpm -v)"
echo "Supabase: $(supabase --version)"
echo "Docker: $(docker --version)"
echo "Vercel: $(vercel --version)"
