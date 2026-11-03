#!/usr/bin/env bash
# 恢复演练：把一份备份真实导入临时库，验证"这份备份能不能用"，然后删掉临时库。
#
# 用法：
#   ./restore-drill.sh                  # 用最新的一份备份
#   ./restore-drill.sh /path/db-xxx.sql.gz
#
# 判据：表集合与生产库完全一致 + 关键表非空。行数只做对照展示（备份时间点不同，
# 行数不必相等，强行比对会误报）。
set -euo pipefail

SOURCE_DB="${TFHERS_DB_NAME:-tfhers}"
DRILL_DB="tfhers_drill"          # 固定名，故意不允许从外部覆盖
BACKUP_DIR="${TFHERS_BACKUP_DIR:-/opt/tfhers/backup}"
CNF="${MYSQL_CNF:-/root/.my.cnf}"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

# ---- 防呆：绝不允许对生产库执行 ----
if [ "$DRILL_DB" = "$SOURCE_DB" ]; then
  die "演练库与生产库同名（$DRILL_DB），拒绝执行"
fi
[ -r "$CNF" ] || die "$CNF 不存在或不可读"

DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  DUMP="$(ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | head -1 || true)"
fi
[ -n "$DUMP" ] || die "$BACKUP_DIR 下没有 db-*.sql.gz"
[ -r "$DUMP" ] || die "备份文件不可读：$DUMP"

mysql_cmd() { mysql --defaults-extra-file="$CNF" --default-character-set=utf8mb4 "$@"; }
table_list() {
  mysql_cmd -N -B -e \
    "SELECT table_name FROM information_schema.tables \
     WHERE table_schema='$1' AND table_type='BASE TABLE' ORDER BY table_name"
}
drop_drill() { mysql_cmd -e "DROP DATABASE IF EXISTS \`$DRILL_DB\`;" >/dev/null 2>&1 || true; }

log "源库=$SOURCE_DB  演练库=$DRILL_DB"
log "备份文件=$DUMP（$(du -h "$DUMP" | cut -f1)）"

# ---- 重建演练库 ----
mysql_cmd -e "DROP DATABASE IF EXISTS \`$DRILL_DB\`;
               CREATE DATABASE \`$DRILL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
trap drop_drill EXIT

# ---- 真实导入（这一步才证明备份可用）----
log "导入中……"
if ! gzip -dc "$DUMP" | mysql_cmd "$DRILL_DB"; then
  die "导入失败：这份备份恢复不出来"
fi

# ---- 校验 1：表集合必须一致 ----
SRC_TABLES="$(table_list "$SOURCE_DB")"
DST_TABLES="$(table_list "$DRILL_DB")"
SRC_N=$(printf '%s\n' "$SRC_TABLES" | grep -c . || true)
DST_N=$(printf '%s\n' "$DST_TABLES" | grep -c . || true)

MISSING="$(comm -23 <(printf '%s\n' "$SRC_TABLES") <(printf '%s\n' "$DST_TABLES"))"
EXTRA="$(comm -13 <(printf '%s\n' "$SRC_TABLES") <(printf '%s\n' "$DST_TABLES"))"

log "表数量：源=$SRC_N  演练=$DST_N"
if [ -n "$MISSING" ]; then
  log "缺失的表："; printf '  - %s\n' $MISSING
fi
if [ -n "$EXTRA" ]; then
  log "多出的表（仅提示）："; printf '  + %s\n' $EXTRA
fi

# ---- 校验 2：关键表非空 + 行数对照 ----
EMPTY=""
for t in users articles rooms tournaments room_messages user_feedback; do
  s="$(mysql_cmd -N -B -e "SELECT COUNT(*) FROM \`$SOURCE_DB\`.\`$t\`" 2>/dev/null || echo '-')"
  d="$(mysql_cmd -N -B -e "SELECT COUNT(*) FROM \`$DRILL_DB\`.\`$t\`" 2>/dev/null || echo '-')"
  printf '  %-18s 生产=%-8s 演练=%-8s\n' "$t" "$s" "$d"
  if [ "$d" = "0" ]; then EMPTY="$EMPTY $t"; fi
done

# ---- 结论 ----
FAIL=0
[ -z "$MISSING" ] || FAIL=1
[ -z "$EMPTY" ]   || FAIL=1

if [ "$FAIL" -eq 0 ]; then
  log "PASS：这份备份可以恢复（表集合一致、关键表有数据）"
else
  log "FAIL：缺失表=【${MISSING:-无}】 空表=【${EMPTY:-无}】"
fi
log "演练库 $DRILL_DB 即将删除（trap 自动清理）"
exit "$FAIL"
