-- P1: tournament registration check-in
ALTER TABLE tournament_registrations
  ADD COLUMN checked_in TINYINT NOT NULL DEFAULT 0 COMMENT '1=checked in' AFTER status,
  ADD COLUMN checked_in_at DATETIME NULL COMMENT 'check-in time' AFTER checked_in;
