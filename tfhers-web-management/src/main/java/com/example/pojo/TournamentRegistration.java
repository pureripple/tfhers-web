package com.example.pojo;

import java.time.LocalDateTime;

public class TournamentRegistration {
    private Long id;
    private Long tournamentId;
    private Long userId;
    private Integer seed;
    private String status;
    /** 0/1 */
    private Integer checkedIn;
    private LocalDateTime checkedInAt;
    /** 完赛名次：1=冠军；未完赛或未上场为 null */
    private Integer finalPlacement;
    private Integer wins;
    private Integer losses;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String nickname;
    private String username;
    private String avatarUrl;
    private Integer rating;
    /** 展示用：社区 users.role=ADMIN */
    private Boolean isAdmin;

    /** 履历展示用（非表列） */
    private String tournamentTitle;
    private String tournamentStatus;
    private LocalDateTime tournamentStartsAt;
    private LocalDateTime tournamentCreatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTournamentId() { return tournamentId; }
    public void setTournamentId(Long tournamentId) { this.tournamentId = tournamentId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getSeed() { return seed; }
    public void setSeed(Integer seed) { this.seed = seed; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getCheckedIn() { return checkedIn; }
    public void setCheckedIn(Integer checkedIn) { this.checkedIn = checkedIn; }
    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }
    public Integer getFinalPlacement() { return finalPlacement; }
    public void setFinalPlacement(Integer finalPlacement) { this.finalPlacement = finalPlacement; }
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
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getTournamentTitle() { return tournamentTitle; }
    public void setTournamentTitle(String tournamentTitle) { this.tournamentTitle = tournamentTitle; }
    public String getTournamentStatus() { return tournamentStatus; }
    public void setTournamentStatus(String tournamentStatus) { this.tournamentStatus = tournamentStatus; }
    public LocalDateTime getTournamentStartsAt() { return tournamentStartsAt; }
    public void setTournamentStartsAt(LocalDateTime tournamentStartsAt) { this.tournamentStartsAt = tournamentStartsAt; }
    public LocalDateTime getTournamentCreatedAt() { return tournamentCreatedAt; }
    public void setTournamentCreatedAt(LocalDateTime tournamentCreatedAt) { this.tournamentCreatedAt = tournamentCreatedAt; }

    public boolean isCheckedInYes() {
        return checkedIn != null && checkedIn == 1;
    }

    public Boolean getIsAdmin() { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }
}
