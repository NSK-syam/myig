#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKSPACE_PATH="${IOS_WORKSPACE_PATH:-$ROOT_DIR/ios/App/App.xcworkspace}"
SCHEME="${IOS_SCHEME:-App}"
CONFIGURATION="${IOS_CONFIGURATION:-Release}"
ARCHIVE_DIR="${IOS_ARCHIVE_DIR:-$ROOT_DIR/ios/build}"
ARCHIVE_PATH="${IOS_ARCHIVE_PATH:-$ARCHIVE_DIR/SearchOutfit.xcarchive}"
EXPORT_PATH="${IOS_EXPORT_PATH:-$ARCHIVE_DIR/export}"
EXPORT_OPTIONS_PLIST="${IOS_EXPORT_OPTIONS_PLIST:-$ROOT_DIR/docs/app-store/export-options-app-store.plist}"
RESOLVED_EXPORT_OPTIONS_PLIST="$EXPORT_OPTIONS_PLIST"

mkdir -p "$ARCHIVE_DIR"

echo "Archiving iOS app"
echo "Workspace: $WORKSPACE_PATH"
echo "Scheme: $SCHEME"
echo "Configuration: $CONFIGURATION"
echo "Archive path: $ARCHIVE_PATH"

if [[ ! -d "$WORKSPACE_PATH" ]]; then
  echo "Workspace not found at $WORKSPACE_PATH"
  exit 1
fi

ARCHIVE_ARGS=(
  -workspace "$WORKSPACE_PATH"
  -scheme "$SCHEME"
  -configuration "$CONFIGURATION"
  -destination "generic/platform=iOS"
  -archivePath "$ARCHIVE_PATH"
)

if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
  echo "Using DEVELOPMENT_TEAM=$APPLE_TEAM_ID for archive/export"
  ARCHIVE_ARGS+=(DEVELOPMENT_TEAM="$APPLE_TEAM_ID")
fi

xcodebuild \
  -allowProvisioningUpdates \
  "${ARCHIVE_ARGS[@]}" \
  clean archive

if [[ -f "$EXPORT_OPTIONS_PLIST" ]]; then
  if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
    RESOLVED_EXPORT_OPTIONS_PLIST="$ARCHIVE_DIR/export-options-resolved.plist"
    sed "s/YOUR_TEAM_ID/$APPLE_TEAM_ID/g" "$EXPORT_OPTIONS_PLIST" > "$RESOLVED_EXPORT_OPTIONS_PLIST"
  elif grep -q "YOUR_TEAM_ID" "$EXPORT_OPTIONS_PLIST"; then
    echo "Archive complete. Export skipped because APPLE_TEAM_ID is not set and $EXPORT_OPTIONS_PLIST still contains YOUR_TEAM_ID."
    exit 0
  fi

  mkdir -p "$EXPORT_PATH"
  echo "Exporting archive with options: $RESOLVED_EXPORT_OPTIONS_PLIST"
  xcodebuild \
    -allowProvisioningUpdates \
    -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$RESOLVED_EXPORT_OPTIONS_PLIST"
  echo "Export complete: $EXPORT_PATH"
else
  echo "Archive complete. Export options plist not found at $EXPORT_OPTIONS_PLIST, so export was skipped."
fi
