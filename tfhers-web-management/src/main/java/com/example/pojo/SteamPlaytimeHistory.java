package com.example.pojo;

import java.time.LocalDateTime;

public class SteamPlaytimeHistory {
    private Long id;
    private Long userId;
    private Long steamId;
    private Integer playtimeMinutes;
    private LocalDateTime capturedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getSteamId() { return steamId; }
    public void setSteamId(Long steamId) { this.steamId = steamId; }

    public Integer getPlaytimeMinutes() { return playtimeMinutes; }
    public void setPlaytimeMinutes(Integer playtimeMinutes) { this.playtimeMinutes = playtimeMinutes; }

    public LocalDateTime getCapturedAt() { return capturedAt; }
    public void setCapturedAt(LocalDateTime capturedAt) { this.capturedAt = capturedAt; }
}

