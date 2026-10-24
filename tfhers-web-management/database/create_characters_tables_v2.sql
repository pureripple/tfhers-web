
CREATE TABLE IF NOT EXISTS characters (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
    name_en VARCHAR(50) NOT NULL COMMENT '英文名，如 Velvet',
    name_zh VARCHAR(50) NOT NULL COMMENT '中文名，如 丝绒',
    avatar_url VARCHAR(500) COMMENT '角色头像URL（OSS）',
    intro TEXT COMMENT '角色简介（短介绍，列表用）',
    background TEXT COMMENT '背景故事（长文）',
    difficulty_level TINYINT DEFAULT 1 COMMENT '难度等级 1-5',
    official_video_url VARCHAR(500) COMMENT '官方教学视频URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_name_en (name_en),
    INDEX idx_name_zh (name_zh),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ========================================
-- 2. 招式表（moves）- 出招表
-- ========================================
CREATE TABLE IF NOT EXISTS moves (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '招式ID',
    character_id BIGINT NOT NULL COMMENT '所属角色ID',
    name_zh VARCHAR(100) NOT NULL COMMENT '招式名称（中文）',
    name_en VARCHAR(100) COMMENT '招式名称（英文，可选）',
    input_command VARCHAR(200) NOT NULL COMMENT '按键操作说明，例如 ↓→ + 攻击',
    description TEXT COMMENT '文字说明',
    motion_image_url VARCHAR(500) COMMENT '动态图像（GIF/WebP）URL',
    order_index INT DEFAULT 0 COMMENT '显示顺序，越小越靠前',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_character_id (character_id),
    INDEX idx_order_index (order_index),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招式表（出招表）';

-- ========================================
-- 3. 连段表（combos）- 普通用户提交的连段
-- ========================================
CREATE TABLE IF NOT EXISTS combos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '连段ID',
    character_id BIGINT NOT NULL COMMENT '所属角色ID',
    title VARCHAR(200) NOT NULL COMMENT '连段标题',
    description TEXT COMMENT '连段说明',
    video_url VARCHAR(500) NOT NULL COMMENT '连段演示视频URL',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    like_count INT DEFAULT 0 COMMENT '点赞次数',
    created_by BIGINT NOT NULL COMMENT '提交用户ID',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态: pending-待审核, approved-已通过, rejected-已拒绝',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_character_id (character_id),
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='连段表（用户提交）';

-- ========================================
-- 4. 连段收藏表（可选，保留）
-- ========================================
CREATE TABLE IF NOT EXISTS combo_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏ID',
    combo_id BIGINT NOT NULL COMMENT '连段ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    
    UNIQUE KEY uk_user_combo (user_id, combo_id),
    INDEX idx_combo_id (combo_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='连段收藏表';

-- ========================================
-- 5. 连段点赞表（可选，保留）
-- ========================================
CREATE TABLE IF NOT EXISTS combo_likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '点赞ID',
    combo_id BIGINT NOT NULL COMMENT '连段ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
    
    UNIQUE KEY uk_user_combo_like (user_id, combo_id),
    INDEX idx_combo_id (combo_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='连段点赞表';

-- ========================================
-- 插入示例数据（可选）
-- ========================================

-- 插入示例角色数据
INSERT INTO characters (name_en, name_zh, avatar_url, intro, background, difficulty_level, official_video_url) VALUES
('Velvet', '丝绒', '/images/CSel3_LargePortVelvet.png', 
 'Velvet是一位优雅而致命的战士，擅长使用丝带进行远距离攻击。她的招式华丽而致命，是许多玩家喜爱的角色。',
 'Velvet来自遥远的东方，从小接受严格的武术训练。她精通丝带舞技，将舞蹈与战斗完美结合，创造出独特的战斗风格。',
 3, '/videos/velvet_official_tutorial.mp4'),

('Oleander', '夹竹桃', '/images/CSel3_LargePortOleander.png',
 'Oleander是一位神秘的毒系战士，擅长使用毒素和幻术。她的攻击带有毒性效果，可以持续削弱敌人。',
 'Oleander生活在充满毒物的森林中，从小与各种毒物为伴。她掌握了控制毒素的能力，并将其运用到战斗中。',
 4, '/videos/oleander_official_tutorial.mp4'),

('Arizona', '亚利桑那', '/images/CSel3_LargePortArizona.png',
 'Arizona是一位西部风格的枪手，擅长远程射击和快速移动。她的攻击精准而致命。',
 'Arizona来自西部荒野，是一位经验丰富的赏金猎人。她精通各种枪械，能够在远距离给予敌人致命一击。',
 2, '/videos/arizona_official_tutorial.mp4'),

('Paprika', '辣椒', '/images/CSel3_LargePortPaprika.png',
 'Paprika是一位热情如火的战士，擅长近战格斗和火焰攻击。她的攻击充满激情和力量。',
 'Paprika来自火山地区，从小在高温环境中成长。她掌握了火焰的力量，并将其融入到格斗技巧中。',
 3, '/videos/paprika_official_tutorial.mp4'),

('Tianhuo', '天火', '/images/CSel3_LargePortTianhuo.png',
 'Tianhuo是一位来自东方的神秘战士，擅长使用天火之力。她的攻击带有神圣的力量。',
 'Tianhuo是古代天火教派的传人，掌握着神圣的天火之力。她将这种力量用于正义的战斗中。',
 5, '/videos/tianhuo_official_tutorial.mp4'),

('Pom', '波姆', '/images/CSel3_LargePortPom.png',
 'Pom是一位可爱的机械师，擅长使用各种机械装置进行战斗。她的攻击充满创意和趣味。',
 'Pom是一位天才机械师，她发明了各种有趣的机械装置。虽然看起来可爱，但她的发明在战斗中非常有效。',
 2, '/videos/pom_official_tutorial.mp4');

-- 插入示例招式数据（为Velvet角色）
INSERT INTO moves (character_id, name_zh, name_en, input_command, description, motion_image_url, order_index) VALUES
(1, '丝带突刺', 'Ribbon Thrust', '↓→ + 攻击', '向前方发射丝带进行突刺攻击，距离远，伤害中等', '/images/moves/velvet_thrust.gif', 1),
(1, '旋转丝带', 'Ribbon Spin', '↓↑ + 攻击', '以自身为中心旋转丝带，对周围敌人造成持续伤害', '/images/moves/velvet_spin.gif', 2),
(1, '丝带束缚', 'Ribbon Bind', '→↓← + 攻击', '用丝带束缚敌人，使其无法移动，持续3秒', '/images/moves/velvet_bind.gif', 3),
(1, '华丽终结', 'Graceful Finish', '↓→↓→ + 攻击', '释放华丽的终结技，对前方大范围造成巨额伤害', '/images/moves/velvet_finish.gif', 4);

-- 插入示例招式数据（为Oleander角色）
INSERT INTO moves (character_id, name_zh, name_en, input_command, description, motion_image_url, order_index) VALUES
(2, '毒雾攻击', 'Poison Mist', '↓→ + 攻击', '释放毒雾，对范围内敌人造成毒素伤害', '/images/moves/oleander_mist.gif', 1),
(2, '幻影分身', 'Phantom Clone', '↓↑ + 攻击', '创造幻影分身，迷惑敌人，持续5秒', '/images/moves/oleander_phantom.gif', 2),
(2, '毒刺连击', 'Poison Strike', '→→ + 攻击', '快速连续攻击，每次攻击都有毒素效果', '/images/moves/oleander_strike.gif', 3),
(2, '剧毒爆发', 'Toxic Burst', '↓→↓→ + 攻击', '引爆所有毒素效果，造成巨额伤害', '/images/moves/oleander_burst.gif', 4);

-- 插入示例用户连段数据（为Velvet角色，状态为已通过）
INSERT INTO combos (character_id, title, description, video_url, created_by, status, view_count, like_count) VALUES
(1, 'Velvet基础连段', '适合新手的基础连段，简单易学', '/videos/combos/velvet_basic.mp4', 2, 'approved', 1250, 89),
(1, 'Velvet高级连段', '高级玩家推荐的连段组合', '/videos/combos/velvet_advanced.mp4', 3, 'approved', 2100, 156),
(1, 'Velvet待审核连段', '用户提交的连段，等待审核', '/videos/combos/velvet_pending.mp4', 4, 'pending', 120, 5);

-- ========================================
-- 查询示例
-- ========================================

-- 1. 查询所有角色
-- SELECT * FROM characters ORDER BY order_index, id;

-- 2. 查询某个角色的所有招式（按顺序）
-- SELECT * FROM moves WHERE character_id = 1 ORDER BY order_index, id;

-- 3. 查询某个角色的所有已审核通过的连段
-- SELECT * FROM combos WHERE character_id = 1 AND status = 'approved' ORDER BY created_at DESC;

-- 4. 查询某个角色的待审核连段
-- SELECT * FROM combos WHERE character_id = 1 AND status = 'pending' ORDER BY created_at DESC;

-- 5. 查询角色详情（包含招式数量和连段数量）
-- SELECT 
--     c.*,
--     COUNT(DISTINCT m.id) as move_count,
--     COUNT(DISTINCT co.id) as combo_count
-- FROM characters c
-- LEFT JOIN moves m ON c.id = m.character_id
-- LEFT JOIN combos co ON c.id = co.character_id AND co.status = 'approved'
-- WHERE c.id = 1
-- GROUP BY c.id;
