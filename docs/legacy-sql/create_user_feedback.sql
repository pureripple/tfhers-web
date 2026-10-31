-- ????????? MySQL ? tfhers ????
CREATE TABLE IF NOT EXISTS `user_feedback` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '??',
  `user_id` BIGINT NOT NULL COMMENT '???? ID',
  `category` VARCHAR(32) NOT NULL DEFAULT 'other' COMMENT '???bug/suggestion/other',
  `title` VARCHAR(100) NOT NULL COMMENT '??',
  `content` VARCHAR(2000) NOT NULL COMMENT '????',
  `contact` VARCHAR(100) NULL DEFAULT NULL COMMENT '????????',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0??? 1??? 2??? 3???',
  `admin_reply` VARCHAR(1000) NULL DEFAULT NULL COMMENT '?????/????',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  `replied_at` DATETIME NULL DEFAULT NULL COMMENT '????',
  PRIMARY KEY (`id`),
  KEY `idx_user_feedback_user_id` (`user_id`),
  KEY `idx_user_feedback_status` (`status`),
  KEY `idx_user_feedback_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??????';
