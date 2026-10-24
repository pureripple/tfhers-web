package com.example.pojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 资讯评论实体（含一级列表与楼中楼扁平回复）
 */
public class ArticleComment {
    private Long id;
    private Long articleId;
    private Long userId;
    private Long parentId;
    private String content;
    /** 0=待审核 1=已通过 2=已拒绝 */
    private Integer status;
    /** 管理员审核备注 */
    private String adminRemark;
    /** 审核时间（可选） */
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private String authorName;
    private String authorAvatar;
    /** 展示用：社区 users.role=ADMIN */
    private Boolean isAdmin;
    /** 被回复用户昵称（楼中楼指向性回复） */
    private String replyToAuthorName;
    /** 被回复用户 ID */
    private Long replyToUserId;
    /** 所属一级评论 ID */
    private Long rootId;
    private List<ArticleComment> replies;

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

    @JsonProperty("parent_id")
    public Long getParentId() { return parentId; }
    @JsonProperty("parentId")
    public void setParentId(Long parentId) { this.parentId = parentId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }

    @JsonProperty("admin_remark")
    public String getAdminRemark() { return adminRemark; }
    @JsonProperty("adminRemark")
    public void setAdminRemark(String adminRemark) { this.adminRemark = adminRemark; }

    @JsonProperty("reviewed_at")
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    @JsonProperty("reviewedAt")
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    @JsonProperty("created_at")
    public LocalDateTime getCreatedAt() { return createdAt; }
    @JsonProperty("createdAt")
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @JsonProperty("authorName")
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    @JsonProperty("authorAvatar")
    public String getAuthorAvatar() { return authorAvatar; }
    public void setAuthorAvatar(String authorAvatar) { this.authorAvatar = authorAvatar; }

    @JsonProperty("replyToAuthorName")
    public String getReplyToAuthorName() { return replyToAuthorName; }
    public void setReplyToAuthorName(String replyToAuthorName) { this.replyToAuthorName = replyToAuthorName; }

    @JsonProperty("replyToUserId")
    public Long getReplyToUserId() { return replyToUserId; }
    public void setReplyToUserId(Long replyToUserId) { this.replyToUserId = replyToUserId; }

    @JsonProperty("rootId")
    public Long getRootId() { return rootId; }
    public void setRootId(Long rootId) { this.rootId = rootId; }

    public List<ArticleComment> getReplies() { return replies; }
    public void setReplies(List<ArticleComment> replies) { this.replies = replies; }

    public Boolean getIsAdmin() { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }
}
