-- =============================================================================
-- articles 表补充 author_id、author_admin_id（与 articlesMapper.xml 一致）
-- 在 MySQL 中执行本文件一次即可，可重复执行（已存在列/索引则跳过）
-- 数据库：与 application.yml 中 spring.datasource 一致（默认 tfhers）
-- =============================================================================

-- author_id：前台用户发布时关联 users.id
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'articles'
    AND COLUMN_NAME = 'author_id');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE articles ADD COLUMN author_id BIGINT NULL COMMENT ''发布用户ID'' AFTER author',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- author_admin_id：管理端发布时关联 admin_users.id
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'articles'
    AND COLUMN_NAME = 'author_admin_id');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE articles ADD COLUMN author_admin_id BIGINT NULL COMMENT ''发布管理员ID(admin_users)'' AFTER author_id',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 索引
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'articles'
    AND INDEX_NAME = 'idx_articles_author_id');
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_articles_author_id ON articles (author_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'articles'
    AND INDEX_NAME = 'idx_articles_author_admin_id');
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_articles_author_admin_id ON articles (author_admin_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'upgrade_articles_author_all: done' AS result;
