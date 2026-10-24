package com.example.pojo;

import java.time.LocalDateTime;

/**
 * 游戏角色实体
 */
public class GameCharacter {
    private Long id;
    private String nameEn;
    private String nameZh;
    private String avatarUrl;
    private String intro;
    private String background;
    private Integer difficultyLevel;
    private String officialVideoUrl;
    private String moveListImageUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GameCharacter() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public String getNameZh() {
        return nameZh;
    }

    public void setNameZh(String nameZh) {
        this.nameZh = nameZh;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getIntro() {
        return intro;
    }

    public void setIntro(String intro) {
        this.intro = intro;
    }

    public String getBackground() {
        return background;
    }

    public void setBackground(String background) {
        this.background = background;
    }

    public Integer getDifficultyLevel() {
        return difficultyLevel;
    }

    public void setDifficultyLevel(Integer difficultyLevel) {
        this.difficultyLevel = difficultyLevel;
    }

    public String getOfficialVideoUrl() {
        return officialVideoUrl;
    }

    public void setOfficialVideoUrl(String officialVideoUrl) {
        this.officialVideoUrl = officialVideoUrl;
    }

    public String getMoveListImageUrl() {
        return moveListImageUrl;
    }

    public void setMoveListImageUrl(String moveListImageUrl) {
        this.moveListImageUrl = moveListImageUrl;
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
}

