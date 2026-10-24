package com.example.pojo;

import java.time.LocalDateTime;

/**
 * 连段实体（普通用户提交）
 */
public class Combo {
    private Long id;
    private Long characterId;
    private String title;
    private String description;
    private Integer damageTotal;
    private String videoUrl;
    private String comboFileUrl;
    private Long createdBy;
    private String status;
    private LocalDateTime createdAt;
    /** 发布者昵称（查询时 join users 填充，仅用于展示） */
    private String authorName;
    /** 发布者头像 URL（查询时 join users 填充） */
    private String authorAvatar;
    /** 角色中文名（我的连段列表 join 填充） */
    private String characterName;
    private LocalDateTime updatedAt;

    public Combo() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public void setCharacterId(Long characterId) {
        this.characterId = characterId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getDamageTotal() {
        return damageTotal;
    }

    public void setDamageTotal(Integer damageTotal) {
        this.damageTotal = damageTotal;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getComboFileUrl() {
        return comboFileUrl;
    }

    public void setComboFileUrl(String comboFileUrl) {
        this.comboFileUrl = comboFileUrl;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getAuthorAvatar() {
        return authorAvatar;
    }

    public void setAuthorAvatar(String authorAvatar) {
        this.authorAvatar = authorAvatar;
    }

    public String getCharacterName() {
        return characterName;
    }

    public void setCharacterName(String characterName) {
        this.characterName = characterName;
    }
}


