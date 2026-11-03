# 数据库备份与恢复（tfhers-web-management）

现状：**线上 MySQL 在 ECS 本机，没有任何自动备份，也没有 binlog**。仓库里的 schema 也不完整
（`articles`、`content_reports`、`official_combos` 没有建表语句），所以**线上这份库是唯一真相来源**。
本文档是第 1 期"保命"的完整操作说明。

目标：任何一次误删/误更新/磁盘损坏，都能在 1 小时内回到某个已知时间点。

---

## 第 0 步：确认数据库参数（1 分钟）

本仓库默认库名 `tfhers`、用户 `root`，但生产可能通过环境变量改过。先看真实值：

```bash
grep -E '^TFHERS_DB_(URL|USERNAME|PASSWORD)=' /etc/tfhers/tfhers.env
```

> 这一行会打印数据库密码。**不要**把输出贴到聊天/issue 里。
> 如果 `TFHERS_DB_URL` 里的库名不是 `tfhers`，记下来，后面所有脚本用 `TFHERS_DB_NAME=xxx` 覆盖。

---

## 第 1 步：立刻做一次全量备份（今天必做，10 分钟）

**不需要停服务**，`--single-transaction` 用的是 InnoDB 一致性快照，不锁表。

```bash
# 1) 建 /root/.my.cnf —— 之后所有 mysql/mysqldump 都不用再敲密码
install -m 600 /dev/null /root/.my.cnf
tee /root/.my.cnf >/dev/null <<'EOF'
[client]
user=root
password=把第 0 步看到的密码粘到这里
default-character-set=utf8mb4
EOF

# 2) 全量备份 + 结构快照
TS=$(date +%F_%H%M%S)
mkdir -p /opt/tfhers/backup
mysqldump --defaults-extra-file=/root/.my.cnf --single-transaction --quick \
  --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF \
  tfhers | gzip -6 > /opt/tfhers/backup/db-$TS.sql.gz

mysqldump --defaults-extra-file=/root/.my.cnf --no-data --skip-comments --routines \
  --default-character-set=utf8mb4 --set-gtid-purged=OFF \
  tfhers > /opt/tfhers/backup/schema-$TS.sql

# 3) 立刻验证（重要：不验证的备份等于没有）
ls -lh /opt/tfhers/backup/
gzip -t /opt/tfhers/backup/db-$TS.sql.gz && echo "gzip 校验通过"
zcat /opt/tfhers/backup/db-$TS.sql.gz | grep -c '^CREATE TABLE'   # 期望 >= 15
```

**验收**：`ls -lh` 有 2 个文件；gzip 校验通过；`CREATE TABLE` 计数与你库里的表数一致（约 21）。

### 下载到你自己的电脑（别只留在服务器上）

在 Windows PowerShell 里：

```powershell
mkdir D:\tfhers-backup -Force
scp root@8.155.136.50:/opt/tfhers/backup/db-*.sql.gz  D:\tfhers-backup\
scp root@8.155.136.50:/opt/tfhers/backup/schema-*.sql  D:\tfhers-backup\
dir D:\tfhers-backup
```

**验收**：本机 `D:\tfhers-backup\` 里能看到这两个文件。

---

## 第 2 步：安装脚本 + 每日自动备份

### 2.1 把脚本放到服务器

在**本机仓库根目录**执行（把两个脚本传上去）：

```powershell
scp deploy/scripts/backup-db.sh       root@8.155.136.50:/opt/tfhers/scripts/
scp deploy/scripts/restore-drill.sh   root@8.155.136.50:/opt/tfhers/scripts/
```

在服务器上：

```bash
mkdir -p /opt/tfhers/scripts
chmod +x /opt/tfhers/scripts/*.sh
bash -n /opt/tfhers/scripts/backup-db.sh      # 语法自检，无输出=通过
bash -n /opt/tfhers/scripts/restore-drill.sh
/opt/tfhers/scripts/backup-db.sh          # 先手工跑一次，看输出
```

期望输出：`备份完成：21 张表，xxx KB`，随后 `WARN: 未安装 ossutil`（第 3 节再解决）。

### 2.2 定时任务

```bash
crontab -e
```
加入一行：

```cron
30 2 * * * /opt/tfhers/scripts/backup-db.sh >> /opt/tfhers/backup/cron.log 2>&1
```

**验收**：第二天 `ls -lh /opt/tfhers/backup/` 出现新的 `db-*` 文件，`cron.log` 里是 `备份完成…`。

脚本默认：本地保留 **7 天**（`TFHERS_BACKUP_KEEP_DAYS`），超过的自动删除。

---

## 第 3 步：异地备份（OSS）

本机备份挡不住"整台 ECS 挂了 / 磁盘损坏"。这一步把 dump 传到另一处。

1. 阿里云控制台 → OSS → 新建 Bucket：`tfhers-backup`，**私有**、与 ECS 同地域（内网免流量费）。
2. RAM → 新建子账号 `tfhers-backup`，只授权这个 bucket 的读写，生成 AccessKey。
3. 服务器安装并配置 ossutil：

```bash
# 以官方脚本为例，装到 /usr/local/bin/ossutil
curl -o ossutil.zip https://gosspublic.alicdn.com/ossutil/1.7.19/ossutil-v1.7.19-linux-amd64.zip
unzip -o ossutil.zip && cp ossutil-v1.7.19-linux-amd64/ossutil64 /usr/local/bin/ossutil && chmod +x /usr/local/bin/ossutil

ossutil config     # 填 endpoint（如 oss-cn-beijing.aliyuncs.com）、AccessKeyId、AccessKeySecret
```

4. 再跑一次 `/opt/tfhers/scripts/backup-db.sh`。

**验收**：输出里有 `已上传 oss://tfhers-backup/db/...`，且 OSS 控制台能看到该文件。

> 建议在 OSS 上给 `db/` 前缀加生命周期规则：30 天后转低频/归档，或直接删除（本地已有 7 天）。

---

## 第 4 步：恢复演练（每月一次）

**没跑过恢复的备份不算备份。** 这个脚本会真实导入到一个叫 `tfhers_drill` 的临时库，校验表集合与
关键表是否有数据，**然后自动删掉临时库**，不碰生产库。

```bash
/opt/tfhers/scripts/restore-drill.sh
```

期望输出结尾：

```
  users              生产=...     演练=...
PASS：这份备份可以恢复（表集合一致、关键表有数据）
```

- 也可以指定某一份：`/opt/tfhers/scripts/restore-drill.sh /opt/tfhers/backup/db-2026-11-03_120000.sql.gz`
- 退码 `0` = 通过，`1` = 不通过（可用于以后接监控）
- 脚本内置防呆：库名固定为 `tfhers_drill`，若与生产库同名会直接拒绝执行

---

## 第 5 步：真出事时怎么恢复

| 场景 | 做法 | 预计耗时 |
|---|---|---|
| 误删几行/一张表 | 临时库恢复最近备份 → 从临时库把数据导回 | 15 分钟 |
| 整库误操作 | 停服务 → `gunzip < dump \| mysql tfhers` → 起服务 | 30 分钟 |
| ECS 整机损坏 | 用 OSS 上的 dump 在新机器/新 RDS 上恢复 + 重配 `.env` | 1–2 小时 |

整库恢复的完整步骤（**先停服务，避免恢复期间有写入**）：

```bash
systemctl stop tfhers-management
mysql -e "CREATE DATABASE IF NOT EXISTS tfhers_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
gunzip -c /opt/tfhers/backup/db-XXXX.sql.gz | mysql tfhers_restore
# 确认无误后再切换：
mysql -e "RENAME TABLE ..."   # 或直接导回 tfhers（务必先再备份一次现状）
```

> 更细的时间点恢复（PITR）需要 binlog，见第 7 节，属于第 3 步之后的事。

---

## 第 6 步：排错

| 现象 | 原因 / 处理 |
|---|---|
| `mysqldump: Got error: 1045 Access denied` | `/root/.my.cnf` 里的 user/password 不对；或库名不对 |
| `备份里只有 0 张表` | 库名写错（空库也能 dump 成功）→ 用 `SHOW DATABASES;` 确认 |
| `WARN: 未安装 ossutil` | 正常，本地备份已完成；按第 3 步装 ossutil |
| cron 没产生文件 | `crontab -l` 看有没有那行；看 `/opt/tfhers/backup/cron.log`；确认脚本有 `+x` |
| 脚本报 `\r: command not found` | 文件被 Windows 换行污染：`sed -i 's/\r$//' /opt/tfhers/scripts/*.sh` |

---

## 第 7 步（后续）：binlog 时间点恢复

全量备份只能回到"昨天凌晨"。要能回到"误操作前 5 分钟"，需要 binlog：

```ini
# /etc/my.cnf  [mysqld]
log_bin                     = /var/lib/mysql/mysql-bin
binlog_expire_logs_seconds  = 604800      # 保留 7 天
server_id                   = 1
innodb_flush_log_at_trx_commit = 1
```
改完 `systemctl restart mysqld`（停机约 1 分钟，挑凌晨）。验证：

```bash
mysql -e "SHOW VARIABLES LIKE 'log_bin';"        # 期望 ON
ls -lh /var/lib/mysql/mysql-bin.000001
```

---

## 验收清单（第 1 期结束时应全部为 ✅）

- [ ] `/root/.my.cnf` 存在且权限 600
- [ ] 今天的手工备份已下载到本机
- [ ] `/opt/tfhers/scripts/backup-db.sh` 可执行且手工跑通
- [ ] crontab 已加，次日自动产生新备份
- [ ] OSS 上能看到异地副本
- [ ] `restore-drill.sh` 跑出 `PASS`
- [ ] ECS 自动快照策略已开启（控制台）
- [ ] binlog 已开启（可选，第 7 步）
