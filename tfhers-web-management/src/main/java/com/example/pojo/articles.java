package com.example.pojo;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class articles {
    private long id;          // 改为long类型匹配数据库bigint
    private String title;
    private String content;
    private String coverUrl;  // 驼峰命名
    private String summary;
    private String author;
    /** 发布用户 ID，列表/详情 LEFT JOIN users 取头像 */
    private Long authorId;
    /** 发布管理员 ID（admin_users），与 author_id 二选一 */
    private Long authorAdminId;
    /** 关联查询填充，非 articles 表字段 */
    private String authorAvatarUrl;
    /** 展示用：社区 users.role=ADMIN */
    private Boolean authorIsAdmin;
    private int viewCount;    // 驼峰命名
    /** 置顶：1 置顶，0 否 */
    private Integer isPinned;
    private String createdAt; // 驼峰命名
    private String updatedAt; // 驼峰命名

    // 默认构造器
    public articles() {}
    
    // 全参构造器
    public articles(long id, String title, String content, String coverUrl, String summary, 
                   String author, int viewCount, String createdAt, String updatedAt) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.coverUrl = coverUrl;
        this.summary = summary;
        this.author = author;
        this.viewCount = viewCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    
    // Getter和Setter方法
    public long getId() {
        return id;
    }
    
    public void setId(long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    @JsonProperty("coverUrl")
    @JsonAlias({"cover_url"})
    public String getCoverUrl() {
        return coverUrl;
    }

    @JsonProperty("coverUrl")
    @JsonAlias({"cover_url"})
    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }
    
    public String getSummary() {
        return summary;
    }
    
    public void setSummary(String summary) {
        this.summary = summary;
    }
    
    public String getAuthor() {
        return author;
    }
    
    public void setAuthor(String author) {
        this.author = author;
    }

    @JsonProperty("author_id")
    public Long getAuthorId() {
        return authorId;
    }

    @JsonProperty("author_id")
    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    @JsonProperty("author_admin_id")
    public Long getAuthorAdminId() {
        return authorAdminId;
    }

    @JsonProperty("author_admin_id")
    public void setAuthorAdminId(Long authorAdminId) {
        this.authorAdminId = authorAdminId;
    }

    @JsonProperty("author_avatar_url")
    public String getAuthorAvatarUrl() {
        return authorAvatarUrl;
    }

    @JsonProperty("author_avatar_url")
    public void setAuthorAvatarUrl(String authorAvatarUrl) {
        this.authorAvatarUrl = authorAvatarUrl;
    }
    
    @JsonProperty("viewCount")
    @JsonAlias({"view_count"})
    public int getViewCount() {
        return viewCount;
    }

    @JsonProperty("viewCount")
    @JsonAlias({"view_count"})
    public void setViewCount(int viewCount) {
        this.viewCount = viewCount;
    }

    @JsonProperty("is_pinned")
    public Integer getIsPinned() {
        return isPinned;
    }

    @JsonProperty("is_pinned")
    @JsonAlias("isPinned")
    public void setIsPinned(Integer isPinned) {
        this.isPinned = isPinned;
    }

    @JsonProperty("created_at")
    public String getCreatedAt() {
        return createdAt;
    }
    
    @JsonProperty("createdAt")
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
    
    @JsonProperty("updated_at")
    public String getUpdatedAt() {
        return updatedAt;
    }
    
    @JsonProperty("updatedAt")
    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    @JsonProperty("author_is_admin")
    public Boolean getAuthorIsAdmin() { return authorIsAdmin; }
    @JsonProperty("author_is_admin")
    public void setAuthorIsAdmin(Boolean authorIsAdmin) { this.authorIsAdmin = authorIsAdmin; }
}
