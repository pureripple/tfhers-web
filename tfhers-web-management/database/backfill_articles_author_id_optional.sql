-- 可选：历史资讯 author_id 为空时，按「作者」字段等于 users.username 尝试补全（执行前请备份）
-- 若作者展示的是昵称而非登录名，可能误匹配，请谨慎使用
/*
UPDATE articles a
INNER JOIN users u ON BINARY u.username = a.author
SET a.author_id = u.id
WHERE a.author_id IS NULL
  AND (a.author_admin_id IS NULL OR a.author_admin_id = 0)
  AND a.author IS NOT NULL
  AND TRIM(a.author) <> '';
*/
