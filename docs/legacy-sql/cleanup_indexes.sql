-- 加速 CLOSED 房间按 closed_at 清理（可重复执行）
-- USE tfhers;

SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms' AND INDEX_NAME = 'idx_rooms_closed_at'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE rooms ADD INDEX idx_rooms_closed_at (status, closed_at)',
  'SELECT ''idx_rooms_closed_at already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
