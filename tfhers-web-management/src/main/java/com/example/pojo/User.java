package com.example.pojo;

import java.time.LocalDateTime;

/**
 * 用户实体类
 */
public class User {
    private Long id;
    private String username;
    private String nickname;
    private String password;
    private String email;
    private String phone;
    private String avatarUrl;
    private Long steamId;          // 绑定的 Steam 64 位 ID
    private String steamPersonaName; // Steam 昵称（可选）
    private String steamAvatarUrl;   // Steam 头像URL（可选）
    private Integer steamPlaytimeMinutes; // 缓存的蹄斗族群总时长（分钟）
    private LocalDateTime steamPlaytimeUpdatedAt; // 缓存更新时间
    private String steamAchievementsJson; // 缓存成就列表 JSON
    private Integer steamAchievementsTotal; // 缓存成就总数
    private Integer steamAchievementsCount; // 缓存已获得成就数
    private LocalDateTime steamAchievementsUpdatedAt; // 缓存更新时间
    private String role; // USER, ADMIN
    private Integer status; // 0-禁用，1-正常
    private LocalDateTime lastLoginTime;
    private String lastLoginIp;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 构造函数
    public User() {}

    public User(String username, String nickname, String password) {
        this.username = username;
        this.nickname = nickname;
        this.password = password;
        this.role = "USER";
        this.status = 1;
    }

    // Getter和Setter方法
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public Long getSteamId() {
        return steamId;
    }

    public void setSteamId(Long steamId) {
        this.steamId = steamId;
    }

    public String getSteamPersonaName() {
        return steamPersonaName;
    }

    public void setSteamPersonaName(String steamPersonaName) {
        this.steamPersonaName = steamPersonaName;
    }

    public String getSteamAvatarUrl() {
        return steamAvatarUrl;
    }

    public void setSteamAvatarUrl(String steamAvatarUrl) {
        this.steamAvatarUrl = steamAvatarUrl;
    }

    public Integer getSteamPlaytimeMinutes() {
        return steamPlaytimeMinutes;
    }

    public void setSteamPlaytimeMinutes(Integer steamPlaytimeMinutes) {
        this.steamPlaytimeMinutes = steamPlaytimeMinutes;
    }

    public LocalDateTime getSteamPlaytimeUpdatedAt() {
        return steamPlaytimeUpdatedAt;
    }

    public void setSteamPlaytimeUpdatedAt(LocalDateTime steamPlaytimeUpdatedAt) {
        this.steamPlaytimeUpdatedAt = steamPlaytimeUpdatedAt;
    }

    public String getSteamAchievementsJson() {
        return steamAchievementsJson;
    }

    public void setSteamAchievementsJson(String steamAchievementsJson) {
        this.steamAchievementsJson = steamAchievementsJson;
    }

    public Integer getSteamAchievementsTotal() {
        return steamAchievementsTotal;
    }

    public void setSteamAchievementsTotal(Integer steamAchievementsTotal) {
        this.steamAchievementsTotal = steamAchievementsTotal;
    }

    public Integer getSteamAchievementsCount() {
        return steamAchievementsCount;
    }

    public void setSteamAchievementsCount(Integer steamAchievementsCount) {
        this.steamAchievementsCount = steamAchievementsCount;
    }

    public LocalDateTime getSteamAchievementsUpdatedAt() {
        return steamAchievementsUpdatedAt;
    }

    public void setSteamAchievementsUpdatedAt(LocalDateTime steamAchievementsUpdatedAt) {
        this.steamAchievementsUpdatedAt = steamAchievementsUpdatedAt;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public LocalDateTime getLastLoginTime() {
        return lastLoginTime;
    }

    public void setLastLoginTime(LocalDateTime lastLoginTime) {
        this.lastLoginTime = lastLoginTime;
    }

    public String getLastLoginIp() {
        return lastLoginIp;
    }

    public void setLastLoginIp(String lastLoginIp) {
        this.lastLoginIp = lastLoginIp;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", nickname='" + nickname + '\'' +
                ", email='" + email + '\'' +
                ", phone='" + phone + '\'' +
                ", avatarUrl='" + avatarUrl + '\'' +
                ", steamId=" + steamId +
                ", steamPersonaName='" + steamPersonaName + '\'' +
                ", steamAvatarUrl='" + steamAvatarUrl + '\'' +
                ", steamPlaytimeMinutes=" + steamPlaytimeMinutes +
                ", steamPlaytimeUpdatedAt=" + steamPlaytimeUpdatedAt +
                ", steamAchievementsTotal=" + steamAchievementsTotal +
                ", steamAchievementsCount=" + steamAchievementsCount +
                ", steamAchievementsUpdatedAt=" + steamAchievementsUpdatedAt +
                ", role='" + role + '\'' +
                ", status=" + status +
                ", lastLoginTime=" + lastLoginTime +
                ", lastLoginIp='" + lastLoginIp + '\'' +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
