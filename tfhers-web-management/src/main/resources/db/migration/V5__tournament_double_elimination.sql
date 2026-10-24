-- P3: double-elimination support
-- Existing tournaments stay single-elim; new creates set bracket_type=double in app code.
ALTER TABLE tournaments
  ADD COLUMN bracket_type VARCHAR(20) NOT NULL DEFAULT 'single'
    COMMENT 'single|double' AFTER max_slots;

ALTER TABLE tournament_matches
  ADD COLUMN bracket_side VARCHAR(20) NOT NULL DEFAULT 'single'
    COMMENT 'single|winners|losers|grand_final' AFTER tournament_id,
  ADD COLUMN loser_next_match_id BIGINT NULL COMMENT 'DE: loser goes here' AFTER next_slot,
  ADD COLUMN loser_next_slot TINYINT NULL COMMENT '1=player1 2=player2' AFTER loser_next_match_id,
  ADD COLUMN is_reset_match TINYINT NOT NULL DEFAULT 0
    COMMENT '1=grand final reset (GF2)' AFTER loser_next_slot;

-- unique was (tournament_id, round, match_index); DE needs side in the key
ALTER TABLE tournament_matches DROP INDEX uk_tm_round_idx;
ALTER TABLE tournament_matches
  ADD UNIQUE KEY uk_tm_side_round_idx (tournament_id, bracket_side, round, match_index);
