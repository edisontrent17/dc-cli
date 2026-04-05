#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p "require('./package.json').version")"
ARCHIVE_BASENAME="dc-cli-${VERSION}"
DIST_DIR="${ROOT_DIR}/release"
ARCHIVE_PATH="${DIST_DIR}/${ARCHIVE_BASENAME}.tar.gz"
STAGE_ROOT="$(mktemp -d)"
STAGE_DIR="${STAGE_ROOT}/${ARCHIVE_BASENAME}"

cleanup() {
  rm -rf "$STAGE_ROOT"
}

trap cleanup EXIT

mkdir -p "$DIST_DIR"
rm -f "$ARCHIVE_PATH"
mkdir -p "$STAGE_DIR"

cp -R \
  README.md \
  Formula \
  bin \
  examples \
  package.json \
  package-lock.json \
  scripts \
  src \
  tsconfig.json \
  "$STAGE_DIR/"

rm -rf \
  "$STAGE_DIR/release" \
  "$STAGE_DIR/node_modules" \
  "$STAGE_DIR/dist"

tar -C "$STAGE_ROOT" -czf "$ARCHIVE_PATH" "$ARCHIVE_BASENAME"

SHA256="$(shasum -a 256 "$ARCHIVE_PATH" | awk '{print $1}')"

cat <<EOF
Created release archive:
  $ARCHIVE_PATH

SHA256:
  $SHA256

Update Formula/dc-cli.rb with:
  url "https://your-host.example.com/${ARCHIVE_BASENAME}.tar.gz"
  sha256 "$SHA256"
EOF
