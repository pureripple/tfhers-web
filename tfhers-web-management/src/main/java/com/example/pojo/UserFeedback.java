package com.example.pojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public class UserFeedback {
    private Long id;
    private Long userId;
    private String category;
    private String title;
    private String content;
    private String contact;
    private Integer status;
    private String adminReply;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime repliedAt;
    private LocalDateTime userReadAt;
    /** computed: admin has reply and user has not read it yet */
    private Boolean unread;

    /** ??????????/???????? */
    private String username;
    private String nickname;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @JsonProperty("user_id")
    public Long getUserId() { return userId; }
    @JsonProperty("userId")
    public void setUserId(Long userId) { this.userId = userId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }

    @JsonProperty("admin_reply")
    public String getAdminReply() { return adminReply; }
    @JsonProperty("adminReply")
    public void setAdminReply(String adminReply) { this.adminReply = adminReply; }

    @JsonProperty("created_at")
    public LocalDateTime getCreatedAt() { return createdAt; }
    @JsonProperty("createdAt")
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @JsonProperty("updated_at")
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    @JsonProperty("updatedAt")
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    
    @JsonProperty("replied_at")
    public LocalDateTime getRepliedAt() { return repliedAt; }
    @JsonProperty("repliedAt")
    public void setRepliedAt(LocalDateTime repliedAt) { this.repliedAt = repliedAt; }


    @JsonProperty("user_read_at")
    public LocalDateTime getUserReadAt() { return userReadAt; }
    @JsonProperty("userReadAt")
    public void setUserReadAt(LocalDateTime userReadAt) { this.userReadAt = userReadAt; }

    public Boolean getUnread() { return unread; }
    public void setUnread(Boolean unread) { this.unread = unread; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
}
