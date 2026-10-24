-- 资讯置顶：App 端右侧「置顶资讯」展示（最多 3 条由前端截取）
SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'articles' AND COLUMN_NAME = 'is_pinned'
    ),
    'SELECT ''upgrade_articles_is_pinned: column exists'' AS result',
    'ALTER TABLE articles ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否置顶'' AFTER view_count'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'upgrade_articles_is_pinned: done' AS result;
