-- 蹄斗族群助手 - 角色管理相关表创建脚本
-- 创建时间: 2024年
-- 说明: 包含角色、招式、连段等相关表结构

-- 1. 角色表
CREATE TABLE characters (
                            id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
                            name VARCHAR(50) NOT NULL COMMENT '角色名称',
                            cover_url VARCHAR(500) COMMENT '角色头像URL',
                            intro TEXT COMMENT '角色介绍',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

                            INDEX idx_name (name),
                            INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 2. 招式表
CREATE TABLE moves (
                       id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '招式ID',
                       character_id BIGINT NOT NULL COMMENT '角色ID',
                       name VARCHAR(100) NOT NULL COMMENT '招式名称',
                       description TEXT COMMENT '招式描述',
                       input_command VARCHAR(200) COMMENT '输入指令',
                       damage_value INT DEFAULT 0 COMMENT '伤害值',
                       video_url VARCHAR(500) COMMENT '演示视频URL',
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

                       INDEX idx_character_id (character_id),
                       INDEX idx_name (name),
                       INDEX idx_created_at (created_at),

                       FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='招式表';

-- 3. 连段表
CREATE TABLE combos (
                        id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '连段ID',
                        character_id BIGINT NOT NULL COMMENT '角色ID',
                        title VARCHAR(200) NOT NULL COMMENT '连段标题',
                        damage_total INT DEFAULT 0 COMMENT '总伤害',
                        video_url VARCHAR(500) COMMENT '演示视频URL',
                        view_count INT DEFAULT 0 COMMENT '浏览次数',
                        like_count INT DEFAULT 0 COMMENT '点赞次数',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                        created_by BIGINT COMMENT '创建者ID (用户ID或管理员ID)',

                        INDEX idx_character_id (character_id),
                        INDEX idx_title (title),
                        INDEX idx_created_by (created_by),
                        INDEX idx_created_at (created_at),

                        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='连段表';

-- 7. 连段收藏表 (用户收藏的连段)
CREATE TABLE combo_favorites (
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

-- 8. 连段点赞表
CREATE TABLE combo_likes (
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

-- 插入一些示例角色数据
INSERT INTO characters (name, cover_url, intro) VALUES
                                                    ('Velvet', '/images/CSel3_LargePortVelvet.png', 'Velvet是一位优雅而致命的战士，擅长使用丝带进行远距离攻击。她的招式华丽而致命，是许多玩家喜爱的角色。'),
                                                    ('Oleander', '/images/CSel3_LargePortOleander.png', 'Oleander是一位神秘的毒系战士，擅长使用毒素和幻术。她的攻击带有毒性效果，可以持续削弱敌人。'),
                                                    ('Arizona', '/images/CSel3_LargePortArizona.png', 'Arizona是一位西部风格的枪手，擅长远程射击和快速移动。她的攻击精准而致命。'),
                                                    ('Paprika', '/images/CSel3_LargePortPaprika.png', 'Paprika是一位热情如火的战士，擅长近战格斗和火焰攻击。她的攻击充满激情和力量。'),
                                                    ('Tianhuo', '/images/CSel3_LargePortTianhuo.png', 'Tianhuo是一位来自东方的神秘战士，擅长使用天火之力。她的攻击带有神圣的力量。'),
                                                    ('Pom', '/images/CSel3_LargePortPom.png', 'Pom是一位可爱的机械师，擅长使用各种机械装置进行战斗。她的攻击充满创意和趣味。');

-- 插入一些示例招式数据 (为Velvet角色)
INSERT INTO moves (character_id, name, description, input_command, damage_value, video_url) VALUES
                                                                                                (1, '丝带突刺', '向前方发射丝带进行突刺攻击，距离远，伤害中等', '↓→ + 攻击', 150, '/videos/velvet_ribbon_thrust.mp4'),
                                                                                                (1, '旋转丝带', '以自身为中心旋转丝带，对周围敌人造成持续伤害', '↓↑ + 攻击', 200, '/videos/velvet_ribbon_spin.mp4'),
                                                                                                (1, '丝带束缚', '用丝带束缚敌人，使其无法移动，持续3秒', '→↓← + 攻击', 100, '/videos/velvet_ribbon_bind.mp4'),
                                                                                                (1, '华丽终结', '释放华丽的终结技，对前方大范围造成巨额伤害', '↓→↓→ + 攻击', 500, '/videos/velvet_ribbon_finish.mp4');

-- 插入一些示例连段数据 (为Velvet角色)
INSERT INTO combos (character_id, title, damage_total, video_url, view_count, like_count, created_by) VALUES
                                                                                                          (1, 'Velvet基础连段', 800, '/videos/velvet_basic_combo.mp4', 1250, 89, 1),
                                                                                                          (1, 'Velvet高级连段', 1200, '/videos/velvet_advanced_combo.mp4', 2100, 156, 1),
                                                                                                          (1, 'Velvet终极连段', 2000, '/videos/velvet_ultimate_combo.mp4', 3500, 298, 1);

-- 插入一些示例招式数据 (为Oleander角色)
INSERT INTO moves (character_id, name, description, input_command, damage_value, video_url) VALUES
                                                                                                (2, '毒雾攻击', '释放毒雾，对范围内敌人造成毒素伤害', '↓→ + 攻击', 120, '/videos/oleander_poison_mist.mp4'),
                                                                                                (2, '幻影分身', '创造幻影分身，迷惑敌人，持续5秒', '↓↑ + 攻击', 80, '/videos/oleander_phantom.mp4'),
                                                                                                (2, '毒刺连击', '快速连续攻击，每次攻击都有毒素效果', '→→ + 攻击', 180, '/videos/oleander_poison_strike.mp4'),
                                                                                                (2, '剧毒爆发', '引爆所有毒素效果，造成巨额伤害', '↓→↓→ + 攻击', 400, '/videos/oleander_poison_burst.mp4');

-- 插入一些示例连段数据 (为Oleander角色)
INSERT INTO combos (character_id, title, damage_total, video_url, view_count, like_count, created_by) VALUES
                                                                                                          (2, 'Oleander毒素连段', 900, '/videos/oleander_poison_combo.mp4', 980, 67, 1),
                                                                                                          (2, 'Oleander幻术连段', 1100, '/videos/oleander_illusion_combo.mp4', 1450, 112, 1);

-- ========================================
-- 查询示例 - 证明可以根据角色ID查询招式和连段
-- ========================================

-- 1. 根据角色ID查询角色的所有招式
-- SELECT * FROM moves WHERE character_id = 1;

-- 2. 根据角色ID查询角色的所有连段
-- SELECT * FROM combos WHERE character_id = 1;

-- 3. 查询角色信息及其招式和连段数量
-- SELECT
--     c.id,
--     c.name,
--     c.intro,
--     COUNT(DISTINCT m.id) as move_count,
--     COUNT(DISTINCT co.id) as combo_count
-- FROM characters c
-- LEFT JOIN moves m ON c.id = m.character_id
-- LEFT JOIN combos co ON c.id = co.character_id
-- WHERE c.id = 1
-- GROUP BY c.id, c.name, c.intro;

-- 4. 查询角色的详细信息，包括所有招式和连段
-- SELECT
--     c.*,
--     m.name as move_name,
--     m.description as move_description,
--     m.input_command,
--     m.damage_value as move_damage,
--     co.title as combo_title,
--     co.damage_total as combo_damage,
--     co.view_count,
--     co.like_count
-- FROM characters c
-- LEFT JOIN moves m ON c.id = m.character_id
-- LEFT JOIN combos co ON c.id = co.character_id
-- WHERE c.id = 1
-- ORDER BY m.id, co.id;
