package com.example.pojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

/**
 * 资讯点赞实体
 */
public class ArticleLike {
    private Long id;
    private Long articleId;
    private Long userId;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @JsonProperty("article_id")
    public Long getArticleId() { return articleId; }
    @JsonProperty("articleId")
    public void setArticleId(Long articleId) { this.articleId = articleId; }

    @JsonProperty("user_id")
    public Long getUserId() { return userId; }
    @JsonProperty("userId")
    public void setUserId(Long userId) { this.userId = userId; }

    @JsonProperty("created_at")
    public LocalDateTime getCreatedAt() { return createdAt; }
    @JsonProperty("createdAt")
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
