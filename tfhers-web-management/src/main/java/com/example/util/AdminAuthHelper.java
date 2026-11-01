package com.example.util;

import com.example.pojo.results;
import com.example.service.AdminUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 管理端鉴权公共方法：最终以 admin_users 存在为准，并要求 JWT type=admin
 *（防止普通 USER Token 在 ID 与 admin_users 撞号时误放行）。
 */
@Component
public class AdminAuthHelper {

    @Autowired
    private AdminUserService adminUserService;

    /**
     * 当前请求是否为已登录且属于 admin_users 的管理员。
     */
    public boolean isAdmin(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return false;
        }
        String type = resolveTokenType(request);
        if (!JwtUtil.TYPE_ADMIN.equals(type)) {
            return false;
        }
        return adminUserService.findById(userId) != null;
    }

    /**
     * Controller 内用法：返回 null 表示通过；否则直接 return 该 results（401/403）。
     */
    public results requireAdmin(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return results.error(401, "未授权，请先登录");
        }
        if (!isAdmin(request)) {
            return results.error(403, "需要管理员权限");
        }
        return null;
    }

    /**
     * 通过校验后取管理员 ID；未通过返回 null。
     */
    public Long adminIdOrNull(HttpServletRequest request) {
        if (!isAdmin(request)) {
            return null;
        }
        return (Long) request.getAttribute("userId");
    }

    private static String resolveTokenType(HttpServletRequest request) {
        Object tokenType = request.getAttribute("tokenType");
        if (tokenType == null) {
            tokenType = request.getAttribute("userType");
        }
        if (tokenType == null) {
            return JwtUtil.TYPE_USER;
        }
        return JwtUtil.TYPE_ADMIN.equals(String.valueOf(tokenType))
                ? JwtUtil.TYPE_ADMIN
                : JwtUtil.TYPE_USER;
    }
}
