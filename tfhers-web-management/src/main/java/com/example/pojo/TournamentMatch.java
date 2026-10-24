package com.example.pojo;

import java.time.LocalDateTime;

public class TournamentMatch {
    private Long id;
    private Long tournamentId;
    private Integer round;
    private Integer matchIndex;
    private Long player1UserId;
    private Long player2UserId;
    private Integer score1;
    private Integer score2;
    private Long winnerId;
    private Long nextMatchId;
    private Integer nextSlot;
    private String status;
    /** 1 = 积分已结算，防止重复加减分 */
    private Integer ratingApplied;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String player1Nickname;
    private String player1AvatarUrl;
    private String player2Nickname;
    private String player2AvatarUrl;
    private String winnerNickname;
    private String roundLabel;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTournamentId() { return tournamentId; }
    public void setTournamentId(Long tournamentId) { this.tournamentId = tournamentId; }
    public Integer getRound() { return round; }
    public void setRound(Integer round) { this.round = round; }
    public Integer getMatchIndex() { return matchIndex; }
    public void setMatchIndex(Integer matchIndex) { this.matchIndex = matchIndex; }
    public Long getPlayer1UserId() { return player1UserId; }
    public void setPlayer1UserId(Long player1UserId) { this.player1UserId = player1UserId; }
    public Long getPlayer2UserId() { return player2UserId; }
    public void setPlayer2UserId(Long player2UserId) { this.player2UserId = player2UserId; }
    public Integer getScore1() { return score1; }
    public void setScore1(Integer score1) { this.score1 = score1; }
    public Integer getScore2() { return score2; }
    public void setScore2(Integer score2) { this.score2 = score2; }
    public Long getWinnerId() { return winnerId; }
    public void setWinnerId(Long winnerId) { this.winnerId = winnerId; }
    public Long getNextMatchId() { return nextMatchId; }
    public void setNextMatchId(Long nextMatchId) { this.nextMatchId = nextMatchId; }
    public Integer getNextSlot() { return nextSlot; }
    public void setNextSlot(Integer nextSlot) { this.nextSlot = nextSlot; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getPlayer1Nickname() { return player1Nickname; }
    public void setPlayer1Nickname(String player1Nickname) { this.player1Nickname = player1Nickname; }
    public String getPlayer1AvatarUrl() { return player1AvatarUrl; }
    public void setPlayer1AvatarUrl(String player1AvatarUrl) { this.player1AvatarUrl = player1AvatarUrl; }
    public String getPlayer2Nickname() { return player2Nickname; }
    public void setPlayer2Nickname(String player2Nickname) { this.player2Nickname = player2Nickname; }
    public String getPlayer2AvatarUrl() { return player2AvatarUrl; }
    public void setPlayer2AvatarUrl(String player2AvatarUrl) { this.player2AvatarUrl = player2AvatarUrl; }
    public String getWinnerNickname() { return winnerNickname; }
    public void setWinnerNickname(String winnerNickname) { this.winnerNickname = winnerNickname; }
    public String getRoundLabel() { return roundLabel; }
    public void setRoundLabel(String roundLabel) { this.roundLabel = roundLabel; }

    public Integer getRatingApplied() { return ratingApplied; }
    public void setRatingApplied(Integer ratingApplied) { this.ratingApplied = ratingApplied; }
}
