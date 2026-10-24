package com.example.service.impl;

import com.example.mapper.UserFeedbackMapper;
import com.example.pojo.UserFeedback;
import com.example.pojo.results;
import com.example.service.UserFeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class UserFeedbackServiceImpl implements UserFeedbackService {

    private static final Set<String> ALLOWED_CATEGORIES =
            new HashSet<>(Arrays.asList("bug", "suggestion", "other"));

    @Autowired
    private UserFeedbackMapper userFeedbackMapper;

    @Override
    public results submit(Long userId, String category, String title, String content, String contact) {
        if (userId == null || userId <= 0) {
            return results.error("请先登录");
        }
        String cat = category == null ? "other" : category.trim().toLowerCase();
        if (!ALLOWED_CATEGORIES.contains(cat)) {
            return results.error("反馈类型无效");
        }
        if (title == null || title.trim().isEmpty()) {
            return results.error("请填写标题");
        }
        title = title.trim();
        if (title.length() > 100) {
            return results.error("标题过长（最多100字）");
        }
        if (content == null || content.trim().isEmpty()) {
            return results.error("请填写详细描述");
        }
        content = content.trim();
        if (content.length() > 2000) {
            return results.error("详细描述过长（最多2000字）");
        }
        if (contact != null) {
            contact = contact.trim();
            if (contact.isEmpty()) {
                contact = null;
            } else if (contact.length() > 100) {
                return results.error("联系方式过长");
            }
        }

        UserFeedback feedback = new UserFeedback();
        feedback.setUserId(userId);
        feedback.setCategory(cat);
        feedback.setTitle(title);
        feedback.setContent(content);
        feedback.setContact(contact);

        int rows = userFeedbackMapper.insert(feedback);
        if (rows > 0) {
            Map<String, Object> data = new HashMap<>();
            data.put("id", feedback.getId());
            return results.success("提交成功，我们会尽快处理", data);
        }
        return results.error("提交失败，请稍后重试");
    }

    @Override
    public Map<String, Object> listMine(Long userId, int page, int size) {
        if (page < 1) page = 1;
        if (size < 1 || size > 50) size = 10;
        int offset = (page - 1) * size;
        List<UserFeedback> list = userFeedbackMapper.selectByUserId(userId, offset, size);
        int total = userFeedbackMapper.countByUserId(userId);
        Map<String, Object> data = new HashMap<>();
        data.put("list", list);
        data.put("total", total);
        data.put("page", page);
        data.put("size", size);
        return data;
    }

    @Override
    public Map<String, Object> listForAdmin(int page, int size, Integer status, String category) {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 10;
        int offset = (page - 1) * size;
        String cat = (category != null && !category.trim().isEmpty()) ? category.trim() : null;
        List<UserFeedback> list = userFeedbackMapper.selectList(offset, size, status, cat);
        int total = userFeedbackMapper.countByFilter(status, cat);
        Map<String, Object> data = new HashMap<>();
        data.put("list", list);
        data.put("total", total);
        return data;
    }

    @Override
    public results updateStatus(Long id, Integer status, String adminReply) {
        if (id == null || id <= 0) {
            return results.error("反馈 ID 无效");
        }
        if (status == null || status < 0 || status > 3) {
            return results.error("状态值无效（0待处理 1处理中 2已处理 3已关闭）");
        }
        if (adminReply != null) {
            adminReply = adminReply.trim();
            if (adminReply.isEmpty()) {
                adminReply = null;
            } else if (adminReply.length() > 1000) {
                return results.error("处理结果过长（最多1000字）");
            }
        }
        UserFeedback existing = userFeedbackMapper.selectById(id);
        if (existing == null) {
            return results.error("反馈不存在");
        }
        // 未传回复时保留原回复
        if (adminReply == null) {
            adminReply = existing.getAdminReply();
        }
        int rows = userFeedbackMapper.updateStatus(id, status, adminReply);
        return rows > 0 ? results.success("更新成功", null) : results.error("更新失败");
    }
}