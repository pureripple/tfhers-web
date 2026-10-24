-- 用户Steam时长历史快照表（用于计算“两周内”增量）
-- playtime_minutes 使用 Steam GetOwnedGames 返回的累计分钟（playtime_forever）

CREATE TABLE IF NOT EXISTS steam_playtime_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  steam_id BIGINT NOT NULL,
  playtime_minutes INT NOT NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_captured (user_id, captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

