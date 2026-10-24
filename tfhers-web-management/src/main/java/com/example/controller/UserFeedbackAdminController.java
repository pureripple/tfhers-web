package com.example.controller;

import com.example.pojo.results;
import com.example.service.UserFeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 管理端：问题反馈处理
 */
@RestController
@RequestMapping("/api/admin/feedback")
@CrossOrigin(origins = "*")
public class UserFeedbackAdminController {

    @Autowired
    private UserFeedbackService userFeedbackService;

    @GetMapping("/list")
    public results list(@RequestParam(defaultValue = "1") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(required = false) Integer status,
                        @RequestParam(required = false) String category) {
        try {
            Map<String, Object> data = userFeedbackService.listForAdmin(page, size, status, category);
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取反馈列表失败：" + e.getMessage());
        }
    }

    /**
     * 更新状态与处理结果
     * body: { "status": 0|1|2|3, "adminReply": "处理说明" }
     */
    @PutMapping("/{id}/status")
    public results updateStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        try {
            if (request == null || request.getStatus() == null) {
                return results.error("状态不能为空");
            }
            return userFeedbackService.updateStatus(id, request.getStatus(), request.getAdminReply());
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新失败：" + e.getMessage());
        }
    }

    public static class StatusRequest {
        private Integer status;
        private String adminReply;

        public Integer getStatus() { return status; }
        public void setStatus(Integer status) { this.status = status; }
        public String getAdminReply() { return adminReply; }
        public void setAdminReply(String adminReply) { this.adminReply = adminReply; }
    }
}