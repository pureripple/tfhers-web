package com.example.controller;

import com.example.pojo.results;
import com.example.service.UserFeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/**
 * 用户端：问题反馈（需登录）
 */
@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*")
public class UserFeedbackController {

    @Autowired
    private UserFeedbackService userFeedbackService;

    /**
     * 提交反馈
     * body: { category, title, content, contact? }
     */
    @PostMapping
    public results submit(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            String category = body != null && body.get("category") != null ? String.valueOf(body.get("category")) : "other";
            String title = body != null && body.get("title") != null ? String.valueOf(body.get("title")) : null;
            String content = body != null && body.get("content") != null ? String.valueOf(body.get("content")) : null;
            String contact = null;
            if (body != null && body.get("contact") != null) {
                contact = String.valueOf(body.get("contact"));
            }
            return userFeedbackService.submit(userId, category, title, content, contact);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("提交失败：" + e.getMessage());
        }
    }

    /**
     * 我的反馈列表（含状态与处理结果）
     */
    @GetMapping("/mine")
    public results listMine(@RequestParam(defaultValue = "1") int page,
                            @RequestParam(defaultValue = "10") int size,
                            HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            Map<String, Object> data = userFeedbackService.listMine(userId, page, size);
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取失败：" + e.getMessage());
        }
    }

    /**
     * Unread admin-reply count for red-dot badge
     */
    @GetMapping("/unread-count")
    public results unreadCount(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            int count = userFeedbackService.countUnread(userId);
            Map<String, Object> data = new java.util.HashMap<>();
            data.put("count", count);
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取失败：" + e.getMessage());
        }
    }

    /**
     * Mark current user's replied feedback as read (clears red-dot)
     */
    @PostMapping("/mark-read")
    public results markRead(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error(401, "请先登录");
            }
            return userFeedbackService.markAllRead(userId);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("操作失败：" + e.getMessage());
        }
    }
}
