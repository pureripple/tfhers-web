#!/usr/bin/env bash
# TFHers MySQL 备份：全量 dump + 结构快照 + OSS 异地 + 本地保留
#
# 用法：
#   ./backup-db.sh            # 正常备份（有 ossutil 就上传）
#   ./backup-db.sh --no-oss   # 只备份到本地
#
# 依赖：/root/.my.cnf（[client] user/password），见 docs/backup-restore.md
# 建议 crontab：30 2 * * * /opt/tfhers/scripts/backup-db.sh >> /opt/tfhers/backup/cron.log 2>&1
set -euo pipefail

DB_NAME="${TFHERS_DB_NAME:-tfhers}"
BACKUP_DIR="${TFHERS_BACKUP_DIR:-/opt/tfhers/backup}"
KEEP_DAYS="${TFHERS_BACKUP_KEEP_DAYS:-7}"
OSS_BUCKET="${TFHERS_BACKUP_OSS_BUCKET:-tfhers-backup}"
OSS_PREFIX="${TFHERS_BACKUP_OSS_PREFIX:-db}"
CNF="${MYSQL_CNF:-/root/.my.cnf}"
MIN_TABLES="${TFHERS_BACKUP_MIN_TABLES:-15}"

DO_OSS=1
for arg in "$@"; do
  case "$arg" in
    --no-oss) DO_OSS=0 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "未知参数: $arg" >&2; exit 2 ;;
  esac
done

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

command -v mysqldump >/dev/null 2>&1 || die "找不到 mysqldump"
command -v gzip >/dev/null 2>&1 || die "找不到 gzip"
[ -r "$CNF" ] || die "$CNF 不存在或不可读；先按 docs/backup-restore.md 建好"

mkdir -p "$BACKUP_DIR"

TS="$(date +%F_%H%M%S)"
DUMP="$BACKUP_DIR/db-$TS.sql.gz"
SCHEMA="$BACKUP_DIR/schema-$TS.sql"
TMP="$BACKUP_DIR/.tmp-$TS.sql"

cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

# ---- 1. 全量逻辑备份（InnoDB 一致性快照，不锁表）----
log "开始备份 $DB_NAME -> $DUMP"
mysqldump --defaults-extra-file="$CNF" \
  --single-transaction --quick \
  --routines --triggers --events \
  --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF \
  "$DB_NAME" > "$TMP" || die "mysqldump 失败"

# ---- 2. 结构快照（无数据，便于 review / 入仓）----
mysqldump --defaults-extra-file="$CNF" \
  --no-data --skip-comments --routines \
  --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF \
  "$DB_NAME" > "$SCHEMA" || die "结构快照失败"

# ---- 3. 压缩 + 完整性校验 ----
gzip -c "$TMP" > "$DUMP" || die "gzip 失败"
gzip -t "$DUMP" || die "备份文件解压校验失败（文件已损坏）"

TABLES=$(grep -c '^CREATE TABLE' "$TMP" || true)
if [ "$TABLES" -lt "$MIN_TABLES" ]; then
  die "备份里只有 $TABLES 张表（预期 >= $MIN_TABLES）—— 疑似不完整，已中止"
fi
chmod 600 "$DUMP" "$SCHEMA"
log "备份完成：$TABLES 张表，$(du -h "$DUMP" | cut -f1)"

# ---- 4. 异地（OSS）。本机备份已成功，上传失败只告警不中断 ----
if [ "$DO_OSS" = "1" ]; then
  if command -v ossutil >/dev/null 2>&1; then
    if ossutil cp -f "$DUMP" "oss://$OSS_BUCKET/$OSS_PREFIX/" >/dev/null 2>&1; then
      log "已上传 oss://$OSS_BUCKET/$OSS_PREFIX/$(basename "$DUMP")"
    else
      log "WARN: OSS 上传失败，本机备份仍在 $DUMP"
    fi
  else
    log "WARN: 未安装 ossutil，只保留本机备份（见 docs/backup-restore.md 第 4 节）"
  fi
fi

# ---- 5. 本地保留策略 ----
find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sql.gz'  -mtime "+$KEEP_DAYS" -print -delete 2>/dev/null || true
find "$BACKUP_DIR" -maxdepth 1 -name 'schema-*.sql' -mtime "+$KEEP_DAYS" -print -delete 2>/dev/null || true

log "完成。本地保留 ${KEEP_DAYS} 天：$(ls -1 "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | wc -l) 份"
