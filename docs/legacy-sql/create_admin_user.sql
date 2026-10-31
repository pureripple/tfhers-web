-- 创建管理员用户表（后台管理系统专用）
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '管理员ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（明文存储）',
    real_name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    avatar_url VARCHAR(500) DEFAULT NULL COMMENT '头像URL（OSS存储）',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    last_login_time TIMESTAMP NULL DEFAULT NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(45) DEFAULT NULL COMMENT '最后登录IP',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_username (username),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员用户表';

-- 删除可能存在的管理员用户
DELETE FROM admin_users WHERE username = 'qinglin';

-- 插入管理员用户
INSERT INTO admin_users (username, password, real_name, email, status) 
VALUES ('qinglin', '974629', '青林', 'qinglin@tfhers.com', 1);

-- 验证插入结果
SELECT id, username, real_name, email, status, created_at FROM admin_users WHERE username = 'qinglin';
