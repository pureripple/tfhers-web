package com.example.pojo;

import java.time.LocalDateTime;

public class Tournament {
    private Long id;
    private String title;
    private String description;
    private String status;
    private Integer maxSlots;
    /** single | double */
    private String bracketType;
    private LocalDateTime registrationOpensAt;
    private LocalDateTime registrationClosesAt;
    private LocalDateTime startsAt;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 列表/详情附加字段（非表列）
    private Integer registrationCount;
    private Boolean registeredByMe;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getMaxSlots() { return maxSlots; }
    public void setMaxSlots(Integer maxSlots) { this.maxSlots = maxSlots; }

    public String getBracketType() { return bracketType; }
    public void setBracketType(String bracketType) { this.bracketType = bracketType; }

    public LocalDateTime getRegistrationOpensAt() { return registrationOpensAt; }
    public void setRegistrationOpensAt(LocalDateTime registrationOpensAt) { this.registrationOpensAt = registrationOpensAt; }
    public LocalDateTime getRegistrationClosesAt() { return registrationClosesAt; }
    public void setRegistrationClosesAt(LocalDateTime registrationClosesAt) { this.registrationClosesAt = registrationClosesAt; }
    public LocalDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(LocalDateTime startsAt) { this.startsAt = startsAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Integer getRegistrationCount() { return registrationCount; }
    public void setRegistrationCount(Integer registrationCount) { this.registrationCount = registrationCount; }
    public Boolean getRegisteredByMe() { return registeredByMe; }
    public void setRegisteredByMe(Boolean registeredByMe) { this.registeredByMe = registeredByMe; }
}