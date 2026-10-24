package com.example.pojo;

import java.time.LocalDateTime;

public class RatingHistory {
    private Long id;
    private Long userId;
    private Long matchId;
    private Long tournamentId;
    private Integer ratingBefore;
    private Integer ratingAfter;
    private Integer delta;
    private Long opponentId;
    private Integer opponentRating;
    private Integer result; // 1 win, 0 loss
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getMatchId() { return matchId; }
    public void setMatchId(Long matchId) { this.matchId = matchId; }
    public Long getTournamentId() { return tournamentId; }
    public void setTournamentId(Long tournamentId) { this.tournamentId = tournamentId; }
    public Integer getRatingBefore() { return ratingBefore; }
    public void setRatingBefore(Integer ratingBefore) { this.ratingBefore = ratingBefore; }
    public Integer getRatingAfter() { return ratingAfter; }
    public void setRatingAfter(Integer ratingAfter) { this.ratingAfter = ratingAfter; }
    public Integer getDelta() { return delta; }
    public void setDelta(Integer delta) { this.delta = delta; }
    public Long getOpponentId() { return opponentId; }
    public void setOpponentId(Long opponentId) { this.opponentId = opponentId; }
    public Integer getOpponentRating() { return opponentRating; }
    public void setOpponentRating(Integer opponentRating) { this.opponentRating = opponentRating; }
    public Integer getResult() { return result; }
    public void setResult(Integer result) { this.result = result; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}