-- 为资讯评论增加审核状态字段
-- 0=待审核 1=已通过 2=已拒绝

ALTER TABLE article_comments
  ADD COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '审核状态：0待审核 1已通过 2已拒绝' AFTER content,
  ADD COLUMN admin_remark VARCHAR(500) NULL COMMENT '管理员审核备注' AFTER status,
  ADD COLUMN reviewed_at DATETIME NULL COMMENT '审核时间' AFTER admin_remark;

CREATE INDEX idx_article_comments_status_created ON article_comments (status, created_at);

