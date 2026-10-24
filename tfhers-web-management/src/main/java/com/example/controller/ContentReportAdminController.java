package com.example.controller;

import com.example.pojo.results;
import com.example.service.ContentReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 管理端：举报审核
 * 需管理员登录后访问（/api/admin/* 走登录拦截器）
 */
@RestController
@RequestMapping("/api/admin/reports")
@CrossOrigin(origins = "*")
public class ContentReportAdminController {

    @Autowired
    private ContentReportService contentReportService;

    /**
     * 举报列表（分页）
     * @param page 页码，默认 1
     * @param size 每页条数，默认 10
     * @param status 状态筛选：0待处理 1处理中 2已处理 3已驳回，不传查全部
     * @param targetType 类型筛选：article/comment/user 等，不传查全部
     * @return { code, msg, data: { list, total } }
     */
    @GetMapping("/list")
    public results list(@RequestParam(defaultValue = "1") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(required = false) Integer status,
                        @RequestParam(required = false) String targetType) {
        try {
            Map<String, Object> data = contentReportService.listForAdmin(page, size, status, targetType);
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取举报列表失败：" + e.getMessage());
        }
    }

    /**
     * 更新举报状态（审核）
     * body: { "status": 0|1|2|3, "adminRemark": "可选备注" }
     */
    @PutMapping("/{id}/status")
    public results updateStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        try {
            if (request == null || request.getStatus() == null) {
                return results.error("状态不能为空");
            }
            return contentReportService.updateReportStatus(id, request.getStatus(), request.getAdminRemark());
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新失败：" + e.getMessage());
        }
    }

    public static class StatusRequest {
        private Integer status;
        private String adminRemark;

        public Integer getStatus() {
            return status;
        }

        public void setStatus(Integer status) {
            this.status = status;
        }

        public String getAdminRemark() {
            return adminRemark;
        }

        public void setAdminRemark(String adminRemark) {
            this.adminRemark = adminRemark;
        }
    }
}
