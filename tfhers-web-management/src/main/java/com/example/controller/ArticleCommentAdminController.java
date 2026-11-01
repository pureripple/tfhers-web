package com.example.controller;

import com.example.mapper.ArticleCommentMapper;
import com.example.pojo.ArticleComment;
import com.example.pojo.results;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理端：资讯评论审核
 */
@RestController
@RequestMapping("/api/admin/article-comments")
public class ArticleCommentAdminController {

    @Autowired
    private ArticleCommentMapper articleCommentMapper;

    /**
     * 评论列表（分页），默认查待审核
     * status: 0待审核 1已通过 2已拒绝
     */
    @GetMapping("/list")
    public results list(@RequestParam(defaultValue = "1") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(required = false) Integer status,
                        @RequestParam(required = false) Long articleId) {
        try {
            // status 不传则查全部；传 0/1/2 筛选待审核/已通过/已拒绝
            if (page < 1) page = 1;
            if (size < 1 || size > 100) size = 10;
            int offset = (page - 1) * size;
            List<ArticleComment> list = articleCommentMapper.selectAdminList(offset, size, status, articleId);
            int total = articleCommentMapper.countAdminList(status, articleId);
            Map<String, Object> data = new HashMap<>();
            data.put("list", list);
            data.put("total", total);
            return results.success("获取成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取评论列表失败：" + e.getMessage());
        }
    }

    /**
     * 审核评论
     * body: { "status": 1|2, "adminRemark": "..." }
     */
    @PutMapping("/{id}/status")
    public results updateStatus(@PathVariable Long id, @RequestBody StatusRequest req) {
        try {
            if (id == null || id <= 0) return results.error("评论ID无效");
            if (req == null || req.getStatus() == null) return results.error("状态不能为空");
            if (req.getStatus() != 1 && req.getStatus() != 2) return results.error("状态值无效（1通过 2拒绝）");
            String remark = req.getAdminRemark();
            if (remark != null && remark.length() > 500) return results.error("备注过长");
            int rows = articleCommentMapper.updateStatus(id, req.getStatus(), remark);
            return rows > 0 ? results.success("更新成功", null) : results.error("更新失败或记录不存在");
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("更新失败：" + e.getMessage());
        }
    }

    public static class StatusRequest {
        private Integer status;
        private String adminRemark;

        public Integer getStatus() { return status; }
        public void setStatus(Integer status) { this.status = status; }
        public String getAdminRemark() { return adminRemark; }
        public void setAdminRemark(String adminRemark) { this.adminRemark = adminRemark; }
    }
}

