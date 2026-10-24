package com.example.service;

import com.example.pojo.results;

import java.util.Map;

public interface ContentReportService {
    results reportArticle(Long articleId, Long userId, String reason, String content, String evidenceUrl);

    /** 举报评论（targetType=comment） */
    results reportComment(Long commentId, Long userId, String reason, String content, String evidenceUrl);

    /** 管理端：分页列表，返回 { list, total } */
    Map<String, Object> listForAdmin(int page, int size, Integer status, String targetType);

    /** 管理端：更新举报状态与备注 */
    results updateReportStatus(Long id, Integer status, String adminRemark);
}

