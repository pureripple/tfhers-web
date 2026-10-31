-- 房间：房主可回看明文密码；聊天支持图片消息
-- USE tfhers;

ALTER TABLE rooms
  ADD COLUMN password_plain VARCHAR(40) NULL COMMENT '房间密码明文（仅房主回看，加入仍校验 BCrypt）' AFTER password_hash;

ALTER TABLE room_messages
  ADD COLUMN msg_type VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT 'text/image' AFTER content;

-- 图片消息 content 存 OSS URL，适当加长
ALTER TABLE room_messages
  MODIFY COLUMN content VARCHAR(1000) NOT NULL COMMENT '文本内容或图片 URL';
