-- 已合并到 upgrade_articles_author_all.sql（可重复执行、自动判断列是否存在）
-- 请执行：upgrade_articles_author_all.sql
--
-- 以下为旧版一次性脚本（若未执行过可手动执行）
-- 资讯关联发布用户，用于列表展示头像等
ALTER TABLE articles
    ADD COLUMN author_id BIGINT NULL COMMENT '发布用户ID' AFTER author;

CREATE INDEX idx_articles_author_id ON articles (author_id);
