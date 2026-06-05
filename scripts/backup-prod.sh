#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/home/admin/backups/songslide"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
TARGET_DIR="$BACKUP_DIR/$DATE"
COMPOSE_PROJECT="songslide"

# Google Drive Configuration (Rclone)
RCLONE_REMOTE="gdrive"
RCLONE_DEST="$RCLONE_REMOTE:/SongSlide_Backups/$DATE"

echo "Starting SongSlide Backup: $DATE"

# Create backup directory locally on VPS
mkdir -p "$TARGET_DIR"

# 1. Backup Database
echo "Backing up PostgreSQL database..."
docker exec ${COMPOSE_PROJECT}-postgres pg_dump -U songslide songslide > "$TARGET_DIR/database.sql"

# 2. Backup Storage Volume
echo "Backing up Storage Volume..."
docker run --rm -v ${COMPOSE_PROJECT}_${COMPOSE_PROJECT}_backend_storage:/backup-volume alpine tar -cz -C /backup-volume . > "$TARGET_DIR/storage.tar.gz"

# 3. Upload to Google Drive using Rclone
echo "Uploading backup to Google Drive..."
rclone copy "$TARGET_DIR" "$RCLONE_DEST"

# 4. Cleanup old backups locally on VPS (keep last 7 days to save VPS disk space)
echo "Cleaning up local VPS backups older than 7 days..."
find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +7 -exec rm -rf {} \;

# Optional: Cleanup old backups on Google Drive (e.g., older than 30 days)
# Uncomment the line below if you want to automatically delete old backups on GDrive
# rclone delete --min-age 30d "$RCLONE_REMOTE:/SongSlide_Backups/" --rmdirs

echo "Backup completed successfully!"
