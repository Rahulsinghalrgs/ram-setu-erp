#!/usr/bin/env bash
set -euo pipefail

if ! xcode-select -p >/dev/null 2>&1; then
  echo "Apple Command Line Tools are not installed. Approve the macOS installer, then rerun this script."
  xcode-select --install
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Installing Homebrew. macOS may ask for your administrator password."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

brew install node git supabase/tap/supabase
brew install --cask docker

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

echo "Open Docker Desktop, finish its permissions, then run:"
echo "  pnpm install"
echo "  supabase start"
echo "  pnpm dev"
