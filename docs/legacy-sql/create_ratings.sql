-- 站内 Elo 排位分（由赛事对阵录入驱动）
-- 执行前请确认库名：USE tfhers;

CREATE TABLE IF NOT EXISTS user_ratings (
  user_id BIGINT NOT NULL PRIMARY KEY COMMENT 'users.id',
  rating INT NOT NULL DEFAULT 1000 COMMENT '当前积分，起始 1000',
  matches_played INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ur_rating (rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户站内排位分';

CREATE TABLE IF NOT EXISTS rating_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  match_id BIGINT NOT NULL COMMENT 'tournament_matches.id',
  tournament_id BIGINT NULL,
  rating_before INT NOT NULL,
  rating_after INT NOT NULL,
  delta INT NOT NULL,
  opponent_id BIGINT NULL,
  opponent_rating INT NULL,
  result TINYINT NOT NULL COMMENT '1=胜 0=负',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rh_user_match (user_id, match_id),
  KEY idx_rh_user (user_id),
  KEY idx_rh_match (match_id),
  KEY idx_rh_tournament (tournament_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分变动流水（防重复结算）';

-- 对阵表：标记是否已结算积分（防改判重复加减）
-- 若列已存在会报错，可忽略
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tournament_matches'
    AND COLUMN_NAME = 'rating_applied'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE tournament_matches ADD COLUMN rating_applied TINYINT NOT NULL DEFAULT 0 COMMENT ''1=已结算积分'' AFTER status',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为已有正常用户补一条默认积分（幂等）
INSERT IGNORE INTO user_ratings (user_id, rating, matches_played, wins, losses)
SELECT id, 1000, 0, 0, 0 FROM users WHERE status = 1;