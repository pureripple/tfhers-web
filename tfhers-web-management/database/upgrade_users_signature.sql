-- 社区用户个性签名字段（「我的」页 / 个人设置）
-- 在 MySQL 中执行本脚本（库名 tfhers）
-- 若列已存在会报 Duplicate column，可忽略

ALTER TABLE `users`
  ADD COLUMN `signature` VARCHAR(200) NULL DEFAULT NULL COMMENT '个性签名' AFTER `avatar_url`;
