# Flyway 数据库迁移（tfhers-web-management）

从本变更起，**新的表结构变更**放进：

`tfhers-web-management/src/main/resources/db/migration/`

由 Spring Boot 启动时自动执行（与 `spring.datasource` 同一套 `TFHERS_DB_*` 环境变量）。  
历史手工脚本已归档到 `docs/legacy-sql/`（原先的 `database/*.sql` 与 `src/main/resources/sql/*.sql`）。Deploy / Actions **不会**整目录执行它们，发版时也不要手工批量跑。

## 配置（application.yml）

- `spring.flyway.enabled: true`
- `locations: classpath:db/migration`
- `baseline-on-migrate: true`
- `baseline-version: 1`
- 迁移失败默认**启动失败**（fail-fast），不会带着半套 schema 起来

未单独配置密码；沿用现有 datasource。

## 第一次在生产库上的行为

生产库通常：**已有 users / articles / rooms 等表**，且**没有** `flyway_schema_history`。

1. Flyway 发现库非空且无历史表 → 写入 baseline：**版本 1**（不执行任何 `V1__*`，仓库里也不放空 V1，避免空脚本问题）
2. 再执行版本 **> 1** 的脚本：当前为 `V2__create_user_feedback.sql`（`CREATE TABLE IF NOT EXISTS`）
3. 若你已手动跑过 `create_user_feedback.sql`，V2 仍安全（表已存在则跳过创建）
4. 之后每次发版只跑**尚未记录**的新 `Vn__*.sql`

全新空库：不会 baseline，直接从最低版本脚本开始（当前即 V2）。

### 如何确认

启动成功后在 MySQL 中：

```sql
SHOW TABLES LIKE 'flyway_schema_history';
SELECT version, description, success, installed_on FROM flyway_schema_history ORDER BY installed_rank;
SHOW TABLES LIKE 'user_feedback';
```

期望：有 history 表；至少有 baseline `1` 与 `2`（create_user_feedback）且 `success=1`。

## 如何新增下一次 SQL

1. 新建文件：`V{下一个整数}__简短英文说明.sql`  
   例：`V3__add_feedback_attachment_url.sql`
2. 只写**增量**、可在目标环境执行一次的语句；**不要**把整份历史 `upgrade_*.sql` 拷进来
3. 本地用同一库启动 management 验证；再 push → Actions 部署换 jar 并 restart 后，生产也会自动跑未执行版本
4. **已合并进仓库的脚本不要改内容**（Flyway 校验 checksum；改已发布脚本会启动失败）

命名规则：`V` + 版本号 + `__` + 描述 + `.sql`（两个下划线）。

## 不要自动跑的历史脚本

下列 `docs/legacy-sql/` 脚本属于**一次性 / 已在生产执行过 / 不可重复**的手工脚本，**不要**整目录交给 Flyway，也不要在部署时批量执行。若某环境缺某一项，应单独写成新的 `Vn__`（并做成幂等或先检查列是否存在）：

| 脚本 | 说明 |
|------|------|
| `create_admin_user.sql` | 种子数据，非结构迁移 |
| `create_users_table.sql` / `create_rooms.sql` / `create_tournaments.sql` / `create_ratings.sql` / `create_characters_tables*.sql` / `create_article_likes_comments.sql` / `create_game_achievement_schema.sql` | 建表历史，生产已有 |
| `create_user_feedback.sql` | 已由 **V2** 接管；文件可留作参考 |
| `alter_users_profile_fields.sql` / `alter_users_steam_level.sql` | ALTER，重复跑会 Duplicate column |
| `upgrade_articles_*.sql` / `upgrade_article_comments_add_status.sql` | 文章相关升级 |
| `upgrade_characters_tables.sql` / `upgrade_move_list_and_combos.sql` | 角色/出招表升级 |
| `upgrade_rooms_*.sql` | 房间聊天图、presence |
| `upgrade_steam_*.sql` | Steam 缓存/时长 |
| `upgrade_users_signature.sql` | 用户签名字段 |
| `backfill_articles_author_id_optional.sql` | 数据回填 |
| `cleanup_indexes.sql` | 运维索引，见 `docs/cleanup-ops.md` |

## 本地验证建议

1. 配置好 `TFHERS_DB_URL` / `TFHERS_DB_USERNAME` / `TFHERS_DB_PASSWORD`（或 `application-local.yml`）
2. `mvn -DskipTests package` 后启动 jar（或 IDE 跑 management）
3. 看启动日志是否有 `Flyway` migrate / baseline；按上面 SQL 核对
4. **不要**在未备份的生产库上随意改 `flyway_schema_history`

## 与自动部署的关系

GitHub Actions Deploy 仍只：构建 jar → rsync → `systemctl restart tfhers-management`。  
**不**单独跑 SQL；重启后新 jar 内嵌的 Flyway 会迁移。密码继续只用服务器 `backend.env`，不必进 Actions Secrets。
