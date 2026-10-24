-- V2: user_feedback table (idempotent if database/create_user_feedback.sql already ran)
CREATE TABLE IF NOT EXISTS `user_feedback` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'id',
  `user_id` BIGINT NOT NULL COMMENT 'submitter user id',
  `category` VARCHAR(32) NOT NULL DEFAULT 'other' COMMENT 'bug/suggestion/other',
  `title` VARCHAR(100) NOT NULL COMMENT 'title',
  `content` VARCHAR(2000) NOT NULL COMMENT 'body',
  `contact` VARCHAR(100) NULL DEFAULT NULL COMMENT 'optional contact',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0 pending 1 processing 2 replied 3 closed',
  `admin_reply` VARCHAR(1000) NULL DEFAULT NULL COMMENT 'admin reply',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'created',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'updated',
  `replied_at` DATETIME NULL DEFAULT NULL COMMENT 'replied',
  PRIMARY KEY (`id`),
  KEY `idx_user_feedback_user_id` (`user_id`),
  KEY `idx_user_feedback_status` (`status`),
  KEY `idx_user_feedback_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='user feedback';
