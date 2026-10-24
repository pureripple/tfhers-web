package com.example.service.impl;

import com.aliyun.green20220302.Client;
import com.aliyun.green20220302.models.TextModerationRequest;
import com.aliyun.green20220302.models.TextModerationResponse;
import com.example.service.AliyunCommentModerationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class AliyunCommentModerationServiceImpl implements AliyunCommentModerationService {

    @Autowired
    private Client greenClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${aliyun.green.service:comment_detection_pro}")
    private String service;

    @Value("${aliyun.green.fail-open:true}")
    private boolean failOpen;

    @Value("${aliyun.green.access-key-id:}")
    private String accessKeyId;

    @Value("${aliyun.green.access-key-secret:}")
    private String accessKeySecret;

    // 兼容：如果你只配置了 OSS 的 AK/SK，这里也能复用（避免 green 配置为空导致审核不生效）
    @Value("${aliyun.oss.access-key-id:}")
    private String ossAccessKeyId;

    @Value("${aliyun.oss.access-key-secret:}")
    private String ossAccessKeySecret;

    @Override
    public ModerationDecision moderateComment(String content, Long userId, Long articleId) {
        if (content == null) {
            return new ModerationDecision(true, "low", Collections.emptyList(), null, null, null);
        }

        String ak = (accessKeyId != null && !accessKeyId.isBlank()) ? accessKeyId : ossAccessKeyId;
        String sk = (accessKeySecret != null && !accessKeySecret.isBlank()) ? accessKeySecret : ossAccessKeySecret;

        // 没配置 AK/SK 时：不要默默放行（否则看起来“敏感词没拦截”）
        if (ak == null || ak.isBlank() || sk == null || sk.isBlank()) {
            String reason = "Aliyun Green 未配置 access-key-id/access-key-secret（也未配置 oss 的 AK/SK 供复用）";
            return failOpen ? passUnknown(reason) : blockUnknown(reason);
        }

        // 组装 ServiceParameters
        try {
            String dataId = "comment-" + (articleId != null ? articleId : "na") + "-" + (userId != null ? userId : "na")
                    + "-" + UUID.randomUUID();

            // 文档示例只要求 content；这里额外带 dataId/accountId 便于追踪（不影响检测）
            String serviceParamsJson = objectMapper.createObjectNode()
                    .put("content", content)
                    .put("dataId", dataId)
                    .put("accountId", userId != null ? String.valueOf(userId) : "")
                    .toString();

            String serviceToUse = normalizeService(service);
            TextModerationRequest req = new TextModerationRequest()
                    .setService(serviceToUse)
                    .setServiceParameters(serviceParamsJson);

            TextModerationResponse resp = greenClient.textModeration(req);

            if (resp == null || resp.getBody() == null) {
                return failOpen ? passUnknown("empty_response") : blockUnknown("empty_response");
            }
            if (resp.getBody().getCode() == null || resp.getBody().getCode() != 200) {
                String message = resp.getBody().getMessage();
                String reason = "code=" + resp.getBody().getCode() + ", message=" + message;
                // 常见：service 写成 comment_detection_pro 会提示 service is invalid
                if (message != null && message.toLowerCase().contains("service is invalid")) {
                    reason += "（请将 aliyun.green.service 配置为 comment_detection）";
                }
                System.out.println("[AliyunGreen] TextModeration FAIL"
                        + " service=" + serviceToUse
                        + " userId=" + userId
                        + " articleId=" + articleId
                        + " " + reason);
                return failOpen ? passUnknown(reason) : blockUnknown(reason);
            }
            if (resp.getBody().getData() == null) {
                return failOpen ? passUnknown("no_data") : blockUnknown("no_data");
            }

            String labelsStr = resp.getBody().getData().getLabels();
            List<String> labels = new ArrayList<>();
            if (labelsStr != null && !labelsStr.isBlank()) {
                for (String s : labelsStr.split(",")) {
                    if (s != null && !s.isBlank()) labels.add(s.trim());
                }
            }

            String rawReason = resp.getBody().getData().getReason();
            // 正常情况下可能不返回 reason（或不是 JSON），此时应视为低风险而不是 unknown
            String riskLevel = "low";
            String riskTips = null;
            String riskWords = null;
            if (rawReason != null && rawReason.trim().startsWith("{")) {
                try {
                    JsonNode n = objectMapper.readTree(rawReason);
                    if (n.hasNonNull("riskLevel")) riskLevel = n.get("riskLevel").asText("unknown");
                    if (n.hasNonNull("riskTips")) riskTips = n.get("riskTips").asText(null);
                    if (n.hasNonNull("riskWords")) riskWords = n.get("riskWords").asText(null);
                } catch (Exception ignored) {
                }
            }

            // 按策略：high/medium 不放行；low 放行；unknown 若 labels 为空则按正常放行（避免误伤正常评论）
            boolean pass;
            if ("high".equalsIgnoreCase(riskLevel) || "medium".equalsIgnoreCase(riskLevel)) {
                pass = false;
            } else if ("unknown".equalsIgnoreCase(riskLevel)) {
                pass = labels.isEmpty();
                if (pass) {
                    riskLevel = "low";
                }
            } else {
                pass = true;
            }
            System.out.println("[AliyunGreen] TextModeration OK"
                    + " service=" + serviceToUse
                    + " userId=" + userId
                    + " articleId=" + articleId
                    + " riskLevel=" + riskLevel
                    + " labels=" + labels
                    + (riskWords != null && !riskWords.isBlank() ? (" riskWords=" + riskWords) : ""));
            return new ModerationDecision(pass, riskLevel, labels, riskTips, riskWords, rawReason);

        } catch (Exception e) {
            // 打印到服务端日志，便于定位 endpoint/service/权限/网络等问题
            e.printStackTrace();
            String reason = e.getClass().getSimpleName() + (e.getMessage() != null ? (": " + e.getMessage()) : "");
            System.out.println("[AliyunGreen] TextModeration EXCEPTION"
                    + " service=" + normalizeService(service)
                    + " userId=" + userId
                    + " articleId=" + articleId
                    + " " + reason);
            return failOpen ? passUnknown(reason) : blockUnknown(reason);
        }
    }

    private ModerationDecision passUnknown(String reason) {
        String r = (reason == null || reason.isBlank()) ? "unknown_error" : reason.trim();
        return new ModerationDecision(true, "unknown", Collections.emptyList(), null, null, r);
    }

    private ModerationDecision blockUnknown(String reason) {
        String r = (reason == null || reason.isBlank()) ? "unknown_error" : reason.trim();
        return new ModerationDecision(false, "unknown", Collections.emptyList(), null, null, r);
    }

    private static String normalizeService(String configured) {
        if (configured == null || configured.isBlank()) {
            return "comment_detection";
        }
        String s = configured.trim();
        // 控制台“专业版”可能写成 comment_detection_pro，但 TextModeration 的 Service 枚举通常仍是 comment_detection
        if ("comment_detection_pro".equalsIgnoreCase(s)) {
            return "comment_detection";
        }
        return s;
    }
}

