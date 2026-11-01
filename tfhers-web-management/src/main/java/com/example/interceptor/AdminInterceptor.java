package com.example.interceptor;

import com.example.util.AdminAuthHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * 管理端路径兜底：/api/admin/**、/api/user-management/**、/api/profile/** 进入业务前强制 admin_users。
 * 须排在 LoginInterceptor 之后注册（依赖其写入的 userId / tokenType）。
 */
@Component
public class AdminInterceptor implements HandlerInterceptor {

    @Autowired
    private AdminAuthHelper adminAuthHelper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        if (path != null && path.equals("/api/admin/login")) {
            return true;
        }
        if (adminAuthHelper.isAdmin(request)) {
            return true;
        }
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            sendJson(response, 401, "未授权，请先登录");
        } else {
            sendJson(response, 403, "需要管理员权限");
        }
        return false;
    }

    private void sendJson(HttpServletResponse response, int code, String message) throws IOException {
        response.setStatus(code);
        response.setContentType("application/json;charset=UTF-8");
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("code", code);
        result.put("message", message);
        result.put("msg", message);
        result.put("data", null);
        ObjectMapper objectMapper = new ObjectMapper();
        response.getWriter().write(objectMapper.writeValueAsString(result));
    }
}
