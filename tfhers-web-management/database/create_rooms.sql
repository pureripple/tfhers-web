-- 房间大厅 MVP：约战房间 + 成员 + 聊天
-- 执行前请确认库名（默认 tfhers）
-- USE tfhers;

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(80) NOT NULL COMMENT '房间标题',
  password_hash VARCHAR(100) NULL COMMENT '房间密码 BCrypt，空表示无密码',
  password_plain VARCHAR(40) NULL COMMENT '房间密码明文（仅房主回看）',
  max_players INT NOT NULL DEFAULT 4 COMMENT '人数上限 2-8',
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN/FULL/CLOSED',
  host_user_id BIGINT NOT NULL COMMENT '房主用户 ID',
  member_count INT NOT NULL DEFAULT 1 COMMENT '当前人数（含房主）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at DATETIME NULL COMMENT '关闭时间',
  KEY idx_rooms_status (status),
  KEY idx_rooms_host (host_user_id),
  KEY idx_rooms_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='约战房间';

CREATE TABLE IF NOT EXISTS room_members (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' COMMENT 'host/member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近心跳',
  UNIQUE KEY uk_room_user (room_id, user_id),
  KEY idx_rm_room (room_id),
  KEY idx_rm_user (user_id),
  KEY idx_rm_last_seen (last_seen_at),
  CONSTRAINT fk_rm_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='房间成员';

CREATE TABLE IF NOT EXISTS room_messages (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content VARCHAR(1000) NOT NULL COMMENT '文本内容或图片 URL',
  msg_type VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT 'text/image',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_msg_room_id (room_id, id),
  KEY idx_msg_room_created (room_id, created_at),
  CONSTRAINT fk_msg_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='房间聊天消息';
