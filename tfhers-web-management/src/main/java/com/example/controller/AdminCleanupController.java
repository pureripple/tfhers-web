package com.example.controller;

import com.example.mapper.AdminUserMapper;
import com.example.pojo.AdminUser;
import com.example.pojo.results;
import com.example.service.CleanupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/**
 * Admin manual cleanup triggers. Requires admin_users JWT (userId exists in admin_users).
 */
@RestController
@RequestMapping("/api/admin/cleanup")
@CrossOrigin(origins = "*")
public class AdminCleanupController {

    @Autowired
    private CleanupService cleanupService;

    @Autowired
    private AdminUserMapper adminUserMapper;

    private results requireAdmin(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return results.error(401, "Please login");
        }
        AdminUser admin = adminUserMapper.findById(userId);
        if (admin == null) {
            return results.error(403, "Admin only");
        }
        return null;
    }

    @PostMapping("/rooms")
    public results purgeRooms(HttpServletRequest request) {
        results denied = requireAdmin(request);
        if (denied != null) return denied;
        Map<String, Object> data = cleanupService.purgeExpiredClosedRooms();
        return results.success("Room purge done", data);
    }

    @PostMapping("/oss-orphans")
    public results purgeOss(HttpServletRequest request) {
        results denied = requireAdmin(request);
        if (denied != null) return denied;
        Map<String, Object> data = cleanupService.cleanupOssOrphans();
        return results.success("OSS orphan cleanup done", data);
    }

    @PostMapping("/reports")
    public results purgeReports(HttpServletRequest request) {
        results denied = requireAdmin(request);
        if (denied != null) return denied;
        Map<String, Object> data = cleanupService.purgeOldResolvedReports();
        return results.success("Report purge done", data);
    }

    @PostMapping("/run-all")
    public results runAll(HttpServletRequest request) {
        results denied = requireAdmin(request);
        if (denied != null) return denied;
        Map<String, Object> data = cleanupService.runAll();
        return results.success("Cleanup run-all done", data);
    }
}