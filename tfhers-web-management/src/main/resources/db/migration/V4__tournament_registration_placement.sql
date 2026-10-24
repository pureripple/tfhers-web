-- P2: per-registration final placement and W-L for tournament history
ALTER TABLE tournament_registrations
  ADD COLUMN final_placement INT NULL COMMENT '1=champion; null=DNP or not finished' AFTER checked_in_at,
  ADD COLUMN wins INT NOT NULL DEFAULT 0 COMMENT 'wins in this tournament' AFTER final_placement,
  ADD COLUMN losses INT NOT NULL DEFAULT 0 COMMENT 'losses in this tournament' AFTER wins;
