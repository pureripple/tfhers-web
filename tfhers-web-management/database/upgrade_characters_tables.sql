-- 蹄斗族群助手 - 角色管理表升级脚本
-- 说明: 如果表已存在，使用此脚本升级表结构（保留现有数据）
-- 注意: 执行前请备份数据库！

-- ========================================
-- 1. 升级角色表（characters）
-- ========================================

-- 如果 name 字段存在，需要迁移数据
-- 假设原 name 字段是英文名，先备份到 name_en
-- ALTER TABLE characters ADD COLUMN name_en VARCHAR(50) AFTER id;
-- UPDATE characters SET name_en = name WHERE name_en IS NULL;
-- ALTER TABLE characters ADD COLUMN name_zh VARCHAR(50) AFTER name_en;
-- ALTER TABLE characters ADD COLUMN background TEXT AFTER intro;
-- ALTER TABLE characters ADD COLUMN difficulty_level TINYINT DEFAULT 1 AFTER background;
-- ALTER TABLE characters ADD COLUMN official_video_url VARCHAR(500) AFTER difficulty_level;
-- ALTER TABLE characters DROP COLUMN name; -- 删除旧字段（谨慎！）

-- 如果表结构完全不同，建议使用以下方式：
-- 1. 备份数据
-- CREATE TABLE characters_backup AS SELECT * FROM characters;

-- 2. 删除旧表
-- DROP TABLE IF EXISTS moves;
-- DROP TABLE IF EXISTS combos;
-- DROP TABLE IF EXISTS combo_favorites;
-- DROP TABLE IF EXISTS combo_likes;
-- DROP TABLE IF EXISTS characters;

-- 3. 执行 create_characters_tables_v2.sql

-- 4. 恢复数据（需要手动调整字段映射）
-- INSERT INTO characters (name_en, name_zh, avatar_url, intro, ...) 
-- SELECT name, name, cover_url, intro, ... FROM characters_backup;

-- ========================================
-- 2. 升级招式表（moves）
-- ========================================

-- 如果 name 字段存在，迁移到 name_zh
-- ALTER TABLE moves ADD COLUMN name_zh VARCHAR(100) AFTER character_id;
-- UPDATE moves SET name_zh = name WHERE name_zh IS NULL;
-- ALTER TABLE moves ADD COLUMN name_en VARCHAR(100) AFTER name_zh;
-- ALTER TABLE moves ADD COLUMN motion_image_url VARCHAR(500) AFTER description;
-- ALTER TABLE moves ADD COLUMN order_index INT DEFAULT 0 AFTER motion_image_url;
-- ALTER TABLE moves DROP COLUMN name; -- 删除旧字段
-- ALTER TABLE moves DROP COLUMN damage_value; -- 如果不需要伤害值
-- ALTER TABLE moves DROP COLUMN video_url; -- 如果不需要视频URL

-- ========================================
-- 3. 升级连段表（combos）
-- ========================================

-- ALTER TABLE combos ADD COLUMN description TEXT AFTER title;
-- ALTER TABLE combos ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER created_by;
-- ALTER TABLE combos MODIFY COLUMN created_by BIGINT NOT NULL;

-- ========================================
-- 建议：如果表结构差异较大，直接使用全新创建脚本更安全
-- ========================================
