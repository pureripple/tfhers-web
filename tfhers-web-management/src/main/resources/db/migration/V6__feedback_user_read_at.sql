-- V6: user_feedback.user_read_at for unread reply red-dot
ALTER TABLE user_feedback
  ADD COLUMN user_read_at DATETIME NULL COMMENT 'user last read reply' AFTER replied_at;
