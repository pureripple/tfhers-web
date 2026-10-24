package com.example.pojo;

import java.time.LocalDateTime;

public class UserRating {
    private Long userId;
    private Integer rating;
    private Integer matchesPlayed;
    private Integer wins;
    private Integer losses;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 展示用（非表字段）
    private String nickname;
    private String avatarUrl;
    private String username;
    /** 展示用：社区 users.role=ADMIN */
    private Boolean isAdmin;
    private String tier;
    private Integer rank;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public Integer getMatchesPlayed() { return matchesPlayed; }
    public void setMatchesPlayed(Integer matchesPlayed) { this.matchesPlayed = matchesPlayed; }
    public Integer getWins() { return wins; }
    public void setWins(Integer wins) { this.wins = wins; }
    public Integer getLosses() { return losses; }
    public void setLosses(Integer losses) { this.losses = losses; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public Integer getRank() { return rank; }
    public void setRank(Integer rank) { this.rank = rank; }

    public Boolean getIsAdmin() { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }
}