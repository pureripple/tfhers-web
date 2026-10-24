-- 比赛 / 淘汰赛 MVP
-- 执行前请确认库名（默认 tfhers）
-- USE tfhers;

CREATE TABLE IF NOT EXISTS tournaments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL COMMENT '比赛名称',
  description VARCHAR(2000) NULL COMMENT '说明',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/registration/closed/ongoing/finished/cancelled',
  max_slots INT NOT NULL DEFAULT 16 COMMENT '名额 8 或 16',
  registration_opens_at DATETIME NULL,
  registration_closes_at DATETIME NULL,
  starts_at DATETIME NULL,
  created_by BIGINT NULL COMMENT '管理员 ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tournaments_status (status),
  KEY idx_tournaments_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事';

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  seed INT NULL COMMENT '签位/种子，生成对阵后可写入',
  status VARCHAR(20) NOT NULL DEFAULT 'registered' COMMENT 'registered/withdrawn',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tournament_user (tournament_id, user_id),
  KEY idx_tr_tournament (tournament_id),
  KEY idx_tr_user (user_id),
  CONSTRAINT fk_tr_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事报名';

CREATE TABLE IF NOT EXISTS tournament_matches (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  round INT NOT NULL COMMENT '1=首轮 … 决赛为最大轮次',
  match_index INT NOT NULL COMMENT '同轮内从 0 开始',
  player1_user_id BIGINT NULL,
  player2_user_id BIGINT NULL,
  score1 INT NULL,
  score2 INT NULL,
  winner_id BIGINT NULL,
  next_match_id BIGINT NULL,
  next_slot TINYINT NULL COMMENT '1=晋级到下一场 player1，2=player2',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/ready/completed/bye',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tm_round_idx (tournament_id, round, match_index),
  KEY idx_tm_tournament (tournament_id),
  KEY idx_tm_next (next_match_id),
  CONSTRAINT fk_tm_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='赛事对阵';