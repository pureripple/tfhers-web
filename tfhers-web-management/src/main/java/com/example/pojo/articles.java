package com.example.pojo;

import com.fasterxml.jackson.annotation.JsonProperty;

public class articles {
    private long id;          // 改为long类型匹配数据库bigint
    private String title;
    private String content;
    private String coverUrl;  // 驼峰命名
    private String summary;
    private String author;
    private int viewCount;    // 驼峰命名
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
    
    @JsonProperty("cover_url")
    public String getCoverUrl() {
        return coverUrl;
    }
    
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
    
    @JsonProperty("view_count")
    public int getViewCount() {
        return viewCount;
    }
    
    public void setViewCount(int viewCount) {
        this.viewCount = viewCount;
    }
    
    @JsonProperty("created_at")
    public String getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
    
    @JsonProperty("updated_at")
    public String getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
