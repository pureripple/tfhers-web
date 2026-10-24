package com.example.service.impl;

import com.example.mapper.ContentReportMapper;
import com.example.pojo.ContentReport;
import com.example.pojo.results;
import com.example.service.ContentReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ContentReportServiceImpl implements ContentReportService {

    @Autowired
    private ContentReportMapper contentReportMapper;

    @Override
    public results reportArticle(Long articleId, Long userId, String reason, String content, String evidenceUrl) {
        return reportTarget("article", articleId, userId, reason, content, evidenceUrl, "文章");
    }

    @Override
    public results reportComment(Long commentId, Long userId, String reason, String content, String evidenceUrl) {
        return reportTarget("comment", commentId, userId, reason, content, evidenceUrl, "评论");
    }

    private results reportTarget(String targetType, Long targetId, Long userId,
                                 String reason, String content, String evidenceUrl, String targetNameZh) {
        if (targetId == null || targetId <= 0) return results.error(targetNameZh + "ID无效");
        if (userId == null || userId <= 0) return results.error("请先登录");
        if (reason == null || reason.trim().isEmpty()) return results.error("请选择举报原因");
        if (reason.length() > 64) return results.error("举报原因过长");
        if (content != null && content.length() > 2000) return results.error("补充说明过长");
        if (evidenceUrl != null && evidenceUrl.length() > 512) return results.error("证据链接过长");

        try {
            int open = contentReportMapper.countOpenReport(userId, targetType, targetId);
            if (open > 0) {
                return results.error("你已举报过该" + targetNameZh + "，处理中请耐心等待");
            }
        } catch (Exception ignored) {}

        ContentReport report = new ContentReport();
        report.setUserId(userId);
        report.setTargetType(targetType);
        report.setTargetId(targetId);
        report.setReason(reason.trim());
        report.setContent(content != null ? content.trim() : null);
        report.setEvidenceUrl(evidenceUrl != null ? evidenceUrl.trim() : null);

        try {
            int rows = contentReportMapper.insert(report);
            return rows > 0 ? results.success("举报成功", report.getId()) : results.error("举报失败");
        } catch (DuplicateKeyException e) {
            return results.error("你已举报过该" + targetNameZh + "，处理中请耐心等待");
        } catch (Exception e) {
            return results.error("举报失败：" + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> listForAdmin(int page, int size, Integer status, String targetType) {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 10;
        int offset = (page - 1) * size;
        List<ContentReport> list = contentReportMapper.selectList(offset, size, status, targetType);
        int total = contentReportMapper.countByFilter(status, targetType);
        Map<String, Object> data = new HashMap<>();
        data.put("list", list);
        data.put("total", total);
        return data;
    }

    @Override
    public results updateReportStatus(Long id, Integer status, String adminRemark) {
        if (id == null || id <= 0) return results.error("举报记录ID无效");
        if (status == null || status < 0 || status > 3) return results.error("状态值无效（0待处理 1处理中 2已处理 3已驳回）");
        if (adminRemark != null && adminRemark.length() > 500) return results.error("管理员备注过长");
        int rows = contentReportMapper.updateStatus(id, status, adminRemark);
        return rows > 0 ? results.success("更新成功", null) : results.error("记录不存在或更新失败");
    }
}

