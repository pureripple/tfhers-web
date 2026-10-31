# 历史手工 SQL（仅供查阅）

这些脚本从 `tfhers-web-management/database/` 和 `tfhers-web-management/src/main/resources/sql/` 归档过来，曾用于在 MySQL 上手工建表或 `ALTER`。

**不要**在部署、GitHub Actions 或启动流程里整目录执行。里面有一次性 `ALTER`、数据回填和种子数据，重复执行会失败，或改掉现有数据。个别种子脚本里还有旧的明文口令，不要再拿去跑。

新的表结构变更只走 Flyway：

- 目录：`tfhers-web-management/src/main/resources/db/migration/`
- 说明：`docs/flyway.md`

`create_user_feedback.sql` 已由迁移 `V2__create_user_feedback.sql` 接管（`IF NOT EXISTS`）。`create_users_table.sql` 原来放在模块的 `resources/sql/`，现在同样只作历史参考，不会打进 jar。

房间 / OSS / 举报清理的现行说明见 `docs/cleanup-ops.md`。索引脚本 `cleanup_indexes.sql` 留在本目录。
