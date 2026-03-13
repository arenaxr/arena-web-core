#!/usr/bin/env bash

# Format ARENA JSON schemas to be inline, keeping lines up to 120 characters width
# Run this from within the arena-web-core/build directory
cd "$(dirname "$0")" || exit 1
npx prettier --write "schemas/*.json" --print-width 120
