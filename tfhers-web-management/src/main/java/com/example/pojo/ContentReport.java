package com.example.pojo;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public class ContentReport {
    private Long id;
    private Long userId;
    private String targetType;
    private Long targetId;
    private String reason;
    private String content;
    private String evidenceUrl;
    private Integer status;
    private String adminRemark;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @JsonProperty("user_id")
    public Long getUserId() { return userId; }
    @JsonProperty("userId")
    public void setUserId(Long userId) { this.userId = userId; }

    @JsonProperty("target_type")
    public String getTargetType() { return targetType; }
    @JsonProperty("targetType")
    public void setTargetType(String targetType) { this.targetType = targetType; }

    @JsonProperty("target_id")
    public Long getTargetId() { return targetId; }
    @JsonProperty("targetId")
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    @JsonProperty("evidence_url")
    public String getEvidenceUrl() { return evidenceUrl; }
    @JsonProperty("evidenceUrl")
    public void setEvidenceUrl(String evidenceUrl) { this.evidenceUrl = evidenceUrl; }

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }

    @JsonProperty("admin_remark")
    public String getAdminRemark() { return adminRemark; }
    @JsonProperty("adminRemark")
    public void setAdminRemark(String adminRemark) { this.adminRemark = adminRemark; }

    @JsonProperty("created_at")
    public LocalDateTime getCreatedAt() { return createdAt; }
    @JsonProperty("createdAt")
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @JsonProperty("updated_at")
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    @JsonProperty("updatedAt")
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

