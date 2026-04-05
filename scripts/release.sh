#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPO_SLUG="edisontrent17/dc-cli"

usage() {
  cat <<'EOF'
Usage:
  scripts/release.sh <version>

Example:
  scripts/release.sh 0.1.2

What it does:
  1. Verifies the git worktree is clean
  2. Bumps package.json and package-lock.json to the requested version
  3. Builds the CLI
  4. Commits and pushes the release commit
  5. Creates and pushes tag v<version>
  6. Downloads the GitHub source tarball for that tag
  7. Updates Formula/dc-cli.rb with the new tag URL and SHA256
  8. Commits and pushes the formula update
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

VERSION="$1"
TAG="v${VERSION}"
TARBALL_URL="https://github.com/${REPO_SLUG}/archive/refs/tags/${TAG}.tar.gz"
TARBALL_PATH="release/github-${TAG}.tar.gz"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: version must look like 0.1.2" >&2
  exit 1
fi

if [[ -n "$(git status --short)" ]]; then
  echo "error: git worktree is not clean" >&2
  git status --short
  exit 1
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: git tag ${TAG} already exists locally" >&2
  exit 1
fi

if git ls-remote --tags origin "$TAG" | grep -q "$TAG"; then
  echo "error: git tag ${TAG} already exists on origin" >&2
  exit 1
fi

node <<EOF
const fs = require("node:fs");

const version = ${VERSION@Q};
const updateJson = (path, updater) => {
  const value = JSON.parse(fs.readFileSync(path, "utf8"));
  updater(value);
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
};

updateJson("package.json", (pkg) => {
  pkg.version = version;
});

updateJson("package-lock.json", (lock) => {
  lock.name = "dc-cli";
  lock.version = version;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].name = "dc-cli";
    lock.packages[""].version = version;
    lock.packages[""].bin = { "dc-cli": "./bin/dc-cli" };
  }
});
EOF

npm run build

git add package.json package-lock.json
git commit -m "Prepare ${TAG} release"
git push origin main

git tag "$TAG"
git push origin "$TAG"

mkdir -p release
curl -L "$TARBALL_URL" -o "$TARBALL_PATH"
SHA256="$(shasum -a 256 "$TARBALL_PATH" | awk '{print $1}')"

python3 - <<EOF
from pathlib import Path
import re

path = Path("Formula/dc-cli.rb")
text = path.read_text()
text = re.sub(
    r'url "https://github.com/edisontrent17/dc-cli/archive/refs/tags/v[^"]+\.tar\.gz"',
    'url "https://github.com/edisontrent17/dc-cli/archive/refs/tags/${TAG}.tar.gz"',
    text,
)
text = re.sub(
    r'sha256 "[0-9a-f]{64}"',
    'sha256 "${SHA256}"',
    text,
)
path.write_text(text)
EOF

git add Formula/dc-cli.rb
git commit -m "Update formula for ${TAG}"
git push origin main

cat <<EOF
Released ${TAG}
GitHub tarball:
  ${TARBALL_URL}
SHA256:
  ${SHA256}

Homebrew install:
  brew install https://raw.githubusercontent.com/${REPO_SLUG}/main/Formula/dc-cli.rb
EOF
