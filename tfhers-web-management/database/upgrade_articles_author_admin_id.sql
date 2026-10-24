-- 已合并到 upgrade_articles_author_all.sql（请优先执行该文件）
--
-- 以下为旧版一次性脚本
-- 管理员发布的资讯：author_id 指向 users，无法关联 admin_users，单独存管理员 ID
ALTER TABLE articles
    ADD COLUMN author_admin_id BIGINT NULL COMMENT '发布管理员ID(admin_users)' AFTER author_id;

CREATE INDEX idx_articles_author_admin_id ON articles (author_admin_id);
