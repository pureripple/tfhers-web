# 数据清理运维（tfhers-web-management）

现行配置以 `tfhers-web-management/src/main/resources/application.yml` 里的 `cleanup.*` 为准。手工接口需要管理员 JWT，且 `userId` 必须存在于 `admin_users`。

## 仓库里的当前值

- `cleanup.rooms.retention-days`: 7（`CLOSED` 房间超过 N 天后硬删除）
- `cleanup.rooms.cron`: `0 30 3 * * ?`（每天 03:30，服务器本地时间）
- `cleanup.oss-orphans.dry-run`: `false`（会实际删除；未配置时代码缺省也是 `false`）
- `cleanup.oss-orphans.min-age-days`: 7
- `cleanup.oss-orphans.cron`: `0 0 4 * * ?`
- `cleanup.oss-orphans.max-delete-per-run`: 200
- `cleanup.content-reports.retention-days`: 14（`status != 0`；未配置时代码缺省是 90）
- `cleanup.content-reports.cron`: `0 0 5 * * ?`

## 手工管理接口

- `POST /api/admin/cleanup/rooms`
- `POST /api/admin/cleanup/oss-orphans`
- `POST /api/admin/cleanup/reports`
- `POST /api/admin/cleanup/run-all`

## 核对 SQL

```sql
SELECT status, COUNT(*) FROM rooms GROUP BY status;
SELECT COUNT(*) FROM rooms WHERE status='CLOSED' AND closed_at < NOW() - INTERVAL 7 DAY;
SELECT COUNT(*) FROM room_members;
SELECT COUNT(*) FROM room_messages;
```

## 仅测试：把某个房间标成可清理

```sql
-- UPDATE rooms SET closed_at = NOW() - INTERVAL 8 DAY WHERE id = ? AND status='CLOSED';
-- then POST /api/admin/cleanup/rooms or wait for cron
```

## 索引

历史脚本 `docs/legacy-sql/cleanup_indexes.sql`（`idx_rooms_closed_at`）。不要在部署时整目录执行 `docs/legacy-sql/`。
