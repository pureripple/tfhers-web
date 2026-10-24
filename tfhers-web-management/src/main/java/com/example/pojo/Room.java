package com.example.pojo;

import java.time.LocalDateTime;

public class Room {
    private Long id;
    private String title;
    private String passwordHash;
    private Integer maxPlayers;
    private String status;
    private Long hostUserId;
    private Integer memberCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;

    // 展示附加字段（非表列）
    private Boolean hasPassword;
    /** 仅房主可见的明文密码（非表外字段时从 password_plain 映射） */
    private String passwordPlain;
    private String hostNickname;
    private String hostAvatarUrl;
    private Boolean joinedByMe;
    private Boolean isHost;
    /** 展示用：社区 users.role=ADMIN */
    private Boolean hostIsAdmin;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Integer getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(Integer maxPlayers) { this.maxPlayers = maxPlayers; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getHostUserId() { return hostUserId; }
    public void setHostUserId(Long hostUserId) { this.hostUserId = hostUserId; }
    public Integer getMemberCount() { return memberCount; }
    public void setMemberCount(Integer memberCount) { this.memberCount = memberCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }
    public Boolean getHasPassword() { return hasPassword; }
    public void setHasPassword(Boolean hasPassword) { this.hasPassword = hasPassword; }
    public String getPasswordPlain() { return passwordPlain; }
    public void setPasswordPlain(String passwordPlain) { this.passwordPlain = passwordPlain; }
    public String getHostNickname() { return hostNickname; }
    public void setHostNickname(String hostNickname) { this.hostNickname = hostNickname; }
    public String getHostAvatarUrl() { return hostAvatarUrl; }
    public void setHostAvatarUrl(String hostAvatarUrl) { this.hostAvatarUrl = hostAvatarUrl; }
    public Boolean getJoinedByMe() { return joinedByMe; }
    public void setJoinedByMe(Boolean joinedByMe) { this.joinedByMe = joinedByMe; }
    public Boolean getIsHost() { return isHost; }
    public void setIsHost(Boolean isHost) { this.isHost = isHost; }

    public Boolean getHostIsAdmin() { return hostIsAdmin; }
    public void setHostIsAdmin(Boolean hostIsAdmin) { this.hostIsAdmin = hostIsAdmin; }
}
