-- 资讯点赞表（用户对某篇文章点赞，二次点击取消）
CREATE TABLE IF NOT EXISTS `article_likes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `article_id` BIGINT NOT NULL COMMENT '文章ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_article_user` (`article_id`, `user_id`),
    KEY `idx_article_id` (`article_id`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资讯点赞表';

-- 资讯评论表（支持多级回复，parent_id 为 null 表示一级评论）
CREATE TABLE IF NOT EXISTS `article_comments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `article_id` BIGINT NOT NULL COMMENT '文章ID',
    `user_id` BIGINT NOT NULL COMMENT '评论用户ID',
    `parent_id` BIGINT DEFAULT NULL COMMENT '父评论ID，NULL 表示一级评论',
    `content` TEXT NOT NULL COMMENT '评论内容',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_article_id` (`article_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资讯评论表';
