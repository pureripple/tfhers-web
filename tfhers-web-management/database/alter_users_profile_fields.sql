-- 个人信息页：性别、生日、背景封面
-- 在 MySQL 中执行（库名 tfhers）。若列已存在会报 Duplicate column，可忽略。

ALTER TABLE `users`
  ADD COLUMN `gender` VARCHAR(20) NULL DEFAULT NULL COMMENT '性别：保密/男/女' AFTER `signature`,
  ADD COLUMN `birthday` DATE NULL DEFAULT NULL COMMENT '生日' AFTER `gender`,
  ADD COLUMN `cover_url` VARCHAR(500) NULL DEFAULT NULL COMMENT '个人主页背景封面URL' AFTER `birthday`;
