package com.example.service.impl;

import com.example.mapper.ArticleCommentMapper;
import com.example.pojo.ArticleComment;
import com.example.pojo.results;
import com.example.service.AliyunCommentModerationService;
import com.example.service.ArticleCommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ArticleCommentServiceImpl implements ArticleCommentService {

    private static final String MSG_PENDING_REVIEW = "评论已提交审核，管理员通过后将公开显示";
    private static final String MSG_PUBLISHED = "评论发表成功";

    @Autowired
    private ArticleCommentMapper articleCommentMapper;

    @Autowired(required = false)
    private AliyunCommentModerationService aliyunCommentModerationService;

    /** 写入待审状态（中风险） */
    private results insertPendingComment(long articleId, long userId, String trimmed, Long parentId) {
        ArticleComment pending = new ArticleComment();
        pending.setArticleId(articleId);
        pending.setUserId(userId);
        pending.setContent(trimmed);
        pending.setParentId(parentId);
        pending.setStatus(0);
        articleCommentMapper.insert(pending);
        return results.success(MSG_PENDING_REVIEW, pending);
    }

    /** 低/无风险：直接通过并公开展示 */
    private results insertApprovedComment(long articleId, long userId, String trimmed, Long parentId) {
        ArticleComment approved = new ArticleComment();
        approved.setArticleId(articleId);
        approved.setUserId(userId);
        approved.setContent(trimmed);
        approved.setParentId(parentId);
        approved.setStatus(1);
        articleCommentMapper.insert(approved);
        return results.success(MSG_PUBLISHED, approved);
    }

    /**
     * Bilibili 风格：一级评论 + 该楼下全部回复扁平列表（含 3 级及以上），
     * 回复的 replyToAuthorName 指向被回复用户。
     */
    @Override
    public List<ArticleComment> getCommentTree(long articleId) {
        List<ArticleComment> all = articleCommentMapper.selectApprovedByArticleId(articleId);
        if (all == null || all.isEmpty()) {
            return new ArrayList<>();
        }

        Map<Long, ArticleComment> byId = new HashMap<>();
        for (ArticleComment c : all) {
            byId.put(c.getId(), c);
            c.setReplies(new ArrayList<>());
        }

        List<ArticleComment> roots = new ArrayList<>();
        for (ArticleComment c : all) {
            if (c.getParentId() == null) {
                c.setRootId(c.getId());
                roots.add(c);
            }
        }

        for (ArticleComment c : all) {
            if (c.getParentId() == null) {
                continue;
            }
            Long rootId = findRootId(c, byId);
            if (rootId == null) {
                continue;
            }
            ArticleComment root = byId.get(rootId);
            if (root == null) {
                continue;
            }
            c.setRootId(rootId);

            ArticleComment parent = byId.get(c.getParentId());
            if (parent != null) {
                c.setReplyToAuthorName(parent.getAuthorName());
                c.setReplyToUserId(parent.getUserId());
            }
            root.getReplies().add(c);
        }

        return roots;
    }

    /** 从 parentId 向上找到一级评论 id */
    private Long findRootId(ArticleComment comment, Map<Long, ArticleComment> byId) {
        ArticleComment cur = comment;
        int guard = 0;
        while (cur != null && cur.getParentId() != null && guard++ < 64) {
            ArticleComment parent = byId.get(cur.getParentId());
            if (parent == null) {
                return null;
            }
            if (parent.getParentId() == null) {
                return parent.getId();
            }
            cur = parent;
        }
        return cur != null ? cur.getId() : null;
    }

    @Override
    public results addComment(long articleId, long userId, String content, Long parentId) {
        try {
            if (content == null || content.trim().isEmpty()) {
                return results.error("评论内容不能为空");
            }

            String trimmed = content.trim();

            if (aliyunCommentModerationService != null) {
                AliyunCommentModerationService.ModerationDecision decision =
                        aliyunCommentModerationService.moderateComment(trimmed, userId, articleId);
                String level = decision.riskLevel != null ? decision.riskLevel.trim() : "";

                // 高风险：直接拒绝
                if ("high".equalsIgnoreCase(level)) {
                    return results.error(400, "评论含有违规内容，已拒绝发布");
                }
                // 中风险：待人工审核
                if ("medium".equalsIgnoreCase(level)) {
                    return insertPendingComment(articleId, userId, trimmed, parentId);
                }
                // 审核服务异常（unknown 且未通过）：按 fail-open=false 时拦截
                if ("unknown".equalsIgnoreCase(level) && !decision.pass) {
                    String detail = decision.rawReasonJson;
                    if (detail != null) {
                        detail = detail.replaceAll("\\s+", " ").trim();
                        if (!detail.isEmpty()) {
                            if (detail.length() > 120) detail = detail.substring(0, 120) + "...";
                            return results.error(400, "评论审核服务暂不可用，请稍后再试（" + detail + "）");
                        }
                    }
                    return results.error(400, "评论审核服务暂不可用，请稍后再试");
                }
                // 低风险 / 无风险（pass=true，含 low）：直接公开展示
                if (decision.pass || "low".equalsIgnoreCase(level)) {
                    return insertApprovedComment(articleId, userId, trimmed, parentId);
                }
                return results.error(400, "评论含有违规内容");
            }

            // 未接入审核服务：视为无风险，直接放行
            return insertApprovedComment(articleId, userId, trimmed, parentId);
        } catch (Exception e) {
            return results.error("发表失败: " + e.getMessage());
        }
    }
}