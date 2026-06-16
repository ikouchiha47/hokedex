#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_GRADLE="$REPO_ROOT/android/app/build.gradle"
APK_PATH="$REPO_ROOT/android/app/build/outputs/apk/release/app-release.apk"

# Read version from build.gradle
VERSION=$(grep 'versionName' "$BUILD_GRADLE" | grep -oE '"[0-9]+\.[0-9]+(\.[0-9]+)?"' | tr -d '"')
TAG="v${VERSION}"

echo "==> Building hokedex $TAG"
cd "$REPO_ROOT/android"
./gradlew assembleRelease --no-build-cache

VERSIONED_APK="/tmp/hokedex-${TAG}.apk"
cp "$APK_PATH" "$VERSIONED_APK"
cp "$APK_PATH" "/tmp/hokedex.apk"

echo "==> Creating git tag $TAG"
cd "$REPO_ROOT"
git tag "$TAG"
git push origin "$TAG"

echo "==> Creating GitHub release $TAG"
gh release create "$TAG" \
  --title "hokédex $TAG" \
  --latest \
  "$VERSIONED_APK#hokedex-${TAG}.apk" \
  "/tmp/hokedex.apk#hokedex.apk"

echo "==> Done. Download URLs:"
echo "    Latest : https://github.com/ikouchiha47/hokedex/releases/latest/download/hokedex.apk"
echo "    This   : https://github.com/ikouchiha47/hokedex/releases/download/${TAG}/hokedex-${TAG}.apk"
