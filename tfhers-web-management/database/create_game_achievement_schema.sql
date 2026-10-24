-- 游戏成就 schema 表（全量成就：名称/描述/图标 URL）
-- 用途：
-- 1) 管理端手动同步 GetSchemaForGame 后落库
-- 2) 用户端展示“全部成就”，并结合 GetPlayerAchievements 点亮

CREATE TABLE IF NOT EXISTS `game_achievement_schema` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `app_id` BIGINT NOT NULL COMMENT 'Steam AppID',
    `api_name` VARCHAR(128) NOT NULL COMMENT '成就 APIName（Steam schema 的 name）',
    `display_name` VARCHAR(255) DEFAULT NULL COMMENT '成就名称（展示用）',
    `description` TEXT DEFAULT NULL COMMENT '成就描述',
    `icon_url` VARCHAR(500) DEFAULT NULL COMMENT '成就彩色图标 URL（优先 OSS）',
    `icon_gray_url` VARCHAR(500) DEFAULT NULL COMMENT '成就灰色图标 URL（优先 OSS）',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_app_api` (`app_id`, `api_name`),
    KEY `idx_app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='游戏成就 schema（全量成就库）';

