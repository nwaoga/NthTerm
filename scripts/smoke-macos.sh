#!/usr/bin/env bash
# Smoke-test an unsigned macOS NthTerm build for ADO #139.
# Prerequisite: npm run release:mac (or CI macos-release job) producing release/ artifacts.
# Clears quarantine (CI stand-in for Gatekeeper right-click Open) then launches the .app,
# checks it stays alive, verifies Application Support persistence, records PTY/shell children
# when observable, and quits cleanly.

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "smoke-macos.sh must run on macOS (found $(uname -s))" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RELEASE_DIR="${NTHTERM_RELEASE_DIR:-$ROOT/release}"
PRODUCT_NAME="${NTHTERM_PRODUCT_NAME:-NthTerm}"
RESULT_PATH="${NTHTERM_SMOKE_RESULT:-$RELEASE_DIR/macos-smoke-validation.json}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nthterm-mac-smoke.XXXXXX")"
APP_PATH=""
SOURCE=""
LAUNCH_PID=""
MOUNT_POINT=""

cleanup() {
  local exit_code=$?
  if [[ -n "${LAUNCH_PID}" ]] && kill -0 "${LAUNCH_PID}" 2>/dev/null; then
    kill "${LAUNCH_PID}" 2>/dev/null || true
    wait "${LAUNCH_PID}" 2>/dev/null || true
  fi
  pkill -x "${PRODUCT_NAME}" 2>/dev/null || true
  if [[ -n "${MOUNT_POINT}" ]]; then
    hdiutil detach "${MOUNT_POINT}" -quiet -force 2>/dev/null || true
  fi
  rm -rf "${WORK_DIR}"
  exit "${exit_code}"
}
trap cleanup EXIT

find_app_bundle_in() {
  local search_root="$1"
  local candidate
  while IFS= read -r candidate; do
    if [[ -d "${candidate}" && -x "${candidate}/Contents/MacOS/${PRODUCT_NAME}" ]]; then
      APP_PATH="${candidate}"
      return 0
    fi
  done < <(find "${search_root}" -type d -name "${PRODUCT_NAME}.app" 2>/dev/null | sort)
  return 1
}

extract_from_zip() {
  local zip_path
  zip_path="$(find "${RELEASE_DIR}" -maxdepth 1 -type f -name "${PRODUCT_NAME}-*-mac-*.zip" | sort | tail -n 1 || true)"
  if [[ -z "${zip_path}" ]]; then
    return 1
  fi
  echo "Unpacking $(basename "${zip_path}")..."
  ditto -x -k "${zip_path}" "${WORK_DIR}/zip"
  if find_app_bundle_in "${WORK_DIR}/zip"; then
    SOURCE="zip:$(basename "${zip_path}")"
    return 0
  fi
  return 1
}

extract_from_dmg() {
  local dmg_path
  dmg_path="$(find "${RELEASE_DIR}" -maxdepth 1 -type f -name "${PRODUCT_NAME}-*-mac-*.dmg" | sort | tail -n 1 || true)"
  if [[ -z "${dmg_path}" ]]; then
    return 1
  fi
  MOUNT_POINT="${WORK_DIR}/dmg-mount"
  mkdir -p "${MOUNT_POINT}"
  echo "Mounting $(basename "${dmg_path}")..."
  hdiutil attach "${dmg_path}" -nobrowse -readonly -mountpoint "${MOUNT_POINT}" >/dev/null
  local mounted_app
  mounted_app="$(find "${MOUNT_POINT}" -maxdepth 2 -type d -name "${PRODUCT_NAME}.app" | head -n 1 || true)"
  if [[ -z "${mounted_app}" ]]; then
    return 1
  fi
  mkdir -p "${WORK_DIR}/from-dmg"
  ditto "${mounted_app}" "${WORK_DIR}/from-dmg/${PRODUCT_NAME}.app"
  hdiutil detach "${MOUNT_POINT}" -quiet -force 2>/dev/null || true
  MOUNT_POINT=""
  APP_PATH="${WORK_DIR}/from-dmg/${PRODUCT_NAME}.app"
  SOURCE="dmg:$(basename "${dmg_path}")"
  return 0
}

is_descendant_of() {
  local pid="$1"
  local ancestor="$2"
  local parent=""
  local depth=0
  parent="${pid}"
  while [[ "${depth}" -lt 12 ]]; do
    parent="$(ps -o ppid= -p "${parent}" 2>/dev/null | tr -d ' ' || true)"
    if [[ -z "${parent}" || "${parent}" == "0" || "${parent}" == "1" ]]; then
      return 1
    fi
    if [[ "${parent}" == "${ancestor}" ]]; then
      return 0
    fi
    depth=$((depth + 1))
  done
  return 1
}

observe_shell_child() {
  local root_pid="$1"
  local helper_pid=""
  local shell_pid=""

  while IFS= read -r helper_pid; do
    [[ -z "${helper_pid}" ]] && continue
    if is_descendant_of "${helper_pid}" "${root_pid}" || [[ "${helper_pid}" == "${root_pid}" ]]; then
      while IFS= read -r shell_pid; do
        [[ -z "${shell_pid}" ]] && continue
        if is_descendant_of "${shell_pid}" "${helper_pid}" || is_descendant_of "${shell_pid}" "${root_pid}"; then
          return 0
        fi
      done < <(pgrep -u "$(id -u)" -x zsh 2>/dev/null || true; pgrep -u "$(id -u)" -x bash 2>/dev/null || true)
    fi
  done < <(pgrep -u "$(id -u)" -f "${PRODUCT_NAME}" 2>/dev/null || true)

  while IFS= read -r shell_pid; do
    [[ -z "${shell_pid}" ]] && continue
    if is_descendant_of "${shell_pid}" "${root_pid}"; then
      return 0
    fi
  done < <(pgrep -u "$(id -u)" -x zsh 2>/dev/null || true; pgrep -u "$(id -u)" -x bash 2>/dev/null || true)

  return 1
}

if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "No release directory at ${RELEASE_DIR}. Run npm run release:mac first." >&2
  exit 1
fi

if find_app_bundle_in "${RELEASE_DIR}"; then
  SOURCE="dir:${APP_PATH#"${RELEASE_DIR}"/}"
elif extract_from_zip; then
  :
elif extract_from_dmg; then
  :
else
  echo "Could not find ${PRODUCT_NAME}.app, mac zip, or mac dmg under ${RELEASE_DIR}" >&2
  ls -la "${RELEASE_DIR}" >&2 || true
  exit 1
fi

echo "App: ${APP_PATH}"
echo "Source: ${SOURCE}"

# Unsigned builds trip Gatekeeper; clearing quarantine matches "right-click Open" for CI.
xattr -dr com.apple.quarantine "${APP_PATH}" 2>/dev/null || true

BINARY="${APP_PATH}/Contents/MacOS/${PRODUCT_NAME}"
if [[ ! -x "${BINARY}" ]]; then
  echo "Missing executable at ${BINARY}" >&2
  exit 1
fi

USER_DATA_DIR="${HOME}/Library/Application Support/${PRODUCT_NAME}"
SQLITE_PATH="${USER_DATA_DIR}/nthterm.sqlite"
mkdir -p "${USER_DATA_DIR}"
MARKER_PATH="${USER_DATA_DIR}/nthterm-macos-smoke-marker.txt"
MARKER_VALUE="macos-smoke $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
printf '%s\n' "${MARKER_VALUE}" > "${MARKER_PATH}"

echo "Launch smoke..."
"${BINARY}" &
LAUNCH_PID=$!

alive_after_launch=false
sqlite_seen=false
shell_child_seen=false
for _ in $(seq 1 25); do
  sleep 1
  if ! kill -0 "${LAUNCH_PID}" 2>/dev/null; then
    wait "${LAUNCH_PID}" || true
    echo "App exited early during smoke window" >&2
    exit 1
  fi
  alive_after_launch=true
  if [[ -f "${SQLITE_PATH}" ]]; then
    sqlite_seen=true
  fi
  if observe_shell_child "${LAUNCH_PID}"; then
    shell_child_seen=true
  fi
  if [[ "${sqlite_seen}" == "true" && "${shell_child_seen}" == "true" ]]; then
    break
  fi
done

if [[ "${alive_after_launch}" != "true" ]]; then
  echo "App did not stay alive" >&2
  exit 1
fi

if [[ "${sqlite_seen}" != "true" ]]; then
  echo "Expected workspace DB at ${SQLITE_PATH} after launch" >&2
  exit 1
fi

if [[ ! -f "${MARKER_PATH}" ]] || [[ "$(cat "${MARKER_PATH}")" != "${MARKER_VALUE}" ]]; then
  echo "Application Support marker was not preserved during smoke launch" >&2
  exit 1
fi

if [[ "${shell_child_seen}" != "true" ]]; then
  echo "Warning: no zsh/bash descendant observed under ${PRODUCT_NAME} (PTY may still be starting)." >&2
fi

echo "Quitting..."
osascript -e "tell application \"${PRODUCT_NAME}\" to quit" >/dev/null 2>&1 || true
for _ in $(seq 1 15); do
  if ! kill -0 "${LAUNCH_PID}" 2>/dev/null; then
    break
  fi
  sleep 1
done
if kill -0 "${LAUNCH_PID}" 2>/dev/null; then
  kill "${LAUNCH_PID}" 2>/dev/null || true
  sleep 1
fi
if kill -0 "${LAUNCH_PID}" 2>/dev/null; then
  kill -9 "${LAUNCH_PID}" 2>/dev/null || true
fi
wait "${LAUNCH_PID}" 2>/dev/null || true
LAUNCH_PID=""
pkill -x "${PRODUCT_NAME}" 2>/dev/null || true

mkdir -p "$(dirname "${RESULT_PATH}")"
sqlite_json=false
shell_json=false
[[ "${sqlite_seen}" == "true" ]] && sqlite_json=true
[[ "${shell_child_seen}" == "true" ]] && shell_json=true

python3 - "${RESULT_PATH}" "${PRODUCT_NAME}" "${SOURCE}" "${APP_PATH}" "${SQLITE_PATH}" "${sqlite_json}" "${shell_json}" <<'PY'
import json
import sys
from pathlib import Path

result_path, product_name, source, app_path, sqlite_path, sqlite_json, shell_json = sys.argv[1:]
result = {
    "productName": product_name,
    "source": source,
    "appPath": app_path,
    "firstLaunchAlive": True,
    "sqliteObserved": sqlite_json == "true",
    "sqlitePath": sqlite_path,
    "shellOrPtyChildObserved": shell_json == "true",
    "markerPreserved": True,
    "quarantineCleared": True,
    "gatekeeperNote": (
        "Unsigned build; quarantine cleared as CI equivalent of Gatekeeper right-click Open"
    ),
}
Path(result_path).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
PY

echo "Wrote ${RESULT_PATH}"
echo "macOS smoke validation passed (#139)."
