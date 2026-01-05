#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICON_DIR="${ROOT_DIR}/public/icons"

SOURCE_APPLE="${ICON_DIR}/apple-touch-icon-152x152.png"
SOURCE_LARGE="${ICON_DIR}/large-310x310.png"
SOURCE_FAVICON="${ICON_DIR}/favicon.ico"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) is required to generate icons." >&2
  exit 1
fi

if [[ ! -f "${SOURCE_APPLE}" || ! -f "${SOURCE_LARGE}" || ! -f "${SOURCE_FAVICON}" ]]; then
  echo "Missing source icons in ${ICON_DIR}. Expected:" >&2
  echo "  - ${SOURCE_APPLE}" >&2
  echo "  - ${SOURCE_LARGE}" >&2
  echo "  - ${SOURCE_FAVICON}" >&2
  exit 1
fi

BACKGROUND_COLOR="#000000"

# Apple touch icon variants.
magick "${SOURCE_APPLE}" -resize 57x57 "${ICON_DIR}/apple-touch-icon-57x57.png"
magick "${SOURCE_APPLE}" -resize 76x76 "${ICON_DIR}/apple-touch-icon-76x76.png"
magick "${SOURCE_APPLE}" -resize 120x120 "${ICON_DIR}/apple-touch-icon-120x120.png"
# Source icon is already 152x152.
cp "${SOURCE_APPLE}" "${ICON_DIR}/apple-touch-icon-precomposed.png"

# PWA/modern icons (reused by Next metadata).
magick "${SOURCE_LARGE}" -resize 16x16 "${ICON_DIR}/icon-16.png"
magick "${SOURCE_LARGE}" -resize 32x32 "${ICON_DIR}/icon-32.png"
magick "${SOURCE_LARGE}" -resize 192x192 "${ICON_DIR}/icon-192.png"
magick "${SOURCE_LARGE}" -resize 512x512 "${ICON_DIR}/icon-512.png"
magick "${SOURCE_LARGE}" -resize 180x180 "${ICON_DIR}/apple-touch-icon.png"
magick "${SOURCE_LARGE}" -resize 192x192 "${ICON_DIR}/maskable-192.png"
magick "${SOURCE_LARGE}" -resize 512x512 "${ICON_DIR}/maskable-512.png"

# Windows tile sizes.
magick "${SOURCE_LARGE}" -resize 70x70 "${ICON_DIR}/tiny.png"
magick "${SOURCE_LARGE}" -resize 150x150 "${ICON_DIR}/square.png"
magick "${SOURCE_LARGE}" -resize 310x310 "${ICON_DIR}/large.png"
magick "${SOURCE_LARGE}" -resize 310x150 -background "${BACKGROUND_COLOR}" -gravity center -extent 310x150 "${ICON_DIR}/wide.png"

echo "Icons generated in ${ICON_DIR}."
