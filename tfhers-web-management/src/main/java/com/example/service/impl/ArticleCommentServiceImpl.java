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

    @Autowired
    private ArticleCommentMapper articleCommentMapper;

    @Autowired(required = false)
    private AliyunCommentModerationService aliyunCommentModerationService;

    /** 审核后发布：写入待审状态 */
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

    /**
     * Bilibili 风格：一级评论 + 该楼下全部回复扁平列表（含 3 级及以上），
     * 回复带 replyToAuthorName 指向被回复用户。
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
                // 回复一级评论时也标出指向；更深层级同样标出被回复人
                c.setReplyToAuthorName(parent.getAuthorName());
                c.setReplyToUserId(parent.getUserId());
            }
            root.getReplies().add(c);
        }

        return roots;
    }

    /** 沿 parentId 向上找到一级评论 id */
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
                if (!decision.pass) {
                    if ("high".equalsIgnoreCase(decision.riskLevel)) {
                        return results.error(400, "评论含有违规内容，已拒绝发布");
                    }
                    if ("medium".equalsIgnoreCase(decision.riskLevel)) {
                        return insertPendingComment(articleId, userId, trimmed, parentId);
                    }
                    if ("unknown".equalsIgnoreCase(decision.riskLevel)) {
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
                    return results.error(400, "评论含有违规内容");
                }
            }

            return insertPendingComment(articleId, userId, trimmed, parentId);
        } catch (Exception e) {
            return results.error("发表失败: " + e.getMessage());
        }
    }
}
