-- 角色出招表图 + 连段表扩展（伤害、连段文件）
-- 执行前请备份数据库

-- 1. 角色表：增加官方出招表图 URL
ALTER TABLE characters
ADD COLUMN move_list_image_url VARCHAR(500) DEFAULT NULL COMMENT '官方出招表图URL' AFTER official_video_url;

-- 2. 连段表：增加总伤害、连段文件 URL（用户发布连段用）
ALTER TABLE combos
ADD COLUMN damage_total INT DEFAULT 0 COMMENT '总伤害' AFTER description,
ADD COLUMN combo_file_url VARCHAR(500) DEFAULT NULL COMMENT '连段文件URL（截图/文件等）' AFTER video_url;
