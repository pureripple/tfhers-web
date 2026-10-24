-- 用户 Steam 成就缓存（与时长缓存同思路）
-- 说明：
-- 1) 缓存最近一次“可用成就列表”JSON + 总成就数 + 已获得数 + 更新时间
-- 2) 业务侧采用“只增不减写库”规则：新 achieved >= 旧 achieved 时才覆盖缓存

SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'steam_achievements_json'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE users ADD COLUMN steam_achievements_json LONGTEXT NULL COMMENT ''Steam 成就缓存JSON''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'steam_achievements_total'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE users ADD COLUMN steam_achievements_total INT NULL COMMENT ''Steam 成就总数缓存''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'steam_achievements_count'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE users ADD COLUMN steam_achievements_count INT NULL COMMENT ''Steam 已获得成就数缓存''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'steam_achievements_updated_at'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE users ADD COLUMN steam_achievements_updated_at DATETIME NULL COMMENT ''Steam 成就缓存更新时间''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

