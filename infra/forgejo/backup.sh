#!/usr/bin/env bash
# Forgejo backup: `forgejo dump` into ./backups, copy it to the Drive mount, prune old ones.
# Run from cron (see README "Backups"). Reads BACKUP_DEST and BACKUP_KEEP from .env.
set -euo pipefail
cd "$(dirname "$0")"

# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a
DEST="${BACKUP_DEST:-/mnt/backups/forgejo}"
KEEP="${BACKUP_KEEP:-14}"
NAME="forgejo-$(date +%F-%H%M).tar.gz"

# The destination folder must already exist (create it once by hand). If the rclone
# mount is down the folder is missing, so we stop instead of filling the boot disk.
if [ ! -d "$DEST" ]; then
  echo "Backup folder $DEST not found. Is the Drive mount up? (create it once with mkdir -p)" >&2
  exit 1
fi

docker exec -u git -w /tmp forgejo forgejo dump --type tar.gz --file "/backups/$NAME"
cp "backups/$NAME" "$DEST/$NAME"

# Keep the 3 newest dumps on the VM and the newest $KEEP on Drive.
ls -1t backups/forgejo-*.tar.gz | tail -n +4 | xargs -r rm --
ls -1t "$DEST"/forgejo-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm --
echo "OK: $DEST/$NAME"
