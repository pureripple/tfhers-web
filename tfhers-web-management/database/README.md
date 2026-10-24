# database/ — 历史手工 SQL（参考）

这些脚本曾用于**手工**在 MySQL 上建表 / ALTER。  
**请勿**在部署脚本或 Actions 里整目录执行。

新的结构变更请使用 Flyway：

- 目录：`src/main/resources/db/migration/`
- 说明：仓库根目录 `docs/flyway.md`

`create_user_feedback.sql` 已由迁移 `V2__create_user_feedback.sql` 接管（`IF NOT EXISTS`）。
