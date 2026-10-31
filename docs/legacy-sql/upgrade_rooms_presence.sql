-- 房间在线心跳：离线自动退房 / 房主转让
-- 在库 tfhers 上执行一次即可
-- USE tfhers;

ALTER TABLE room_members
  ADD COLUMN last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT '最近心跳（轮询/进房时刷新）'
  AFTER joined_at;

CREATE INDEX idx_rm_last_seen ON room_members (last_seen_at);

-- 说明：一人只能拥有一个 OPEN/FULL 房间，由后端校验（MySQL 不便做「仅开放状态」唯一索引）。
-- 一人同时只能加入一个开放房间，由 join 时自动离开旧房保证。
