package com.example.interceptor;

import com.example.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * 登录拦截器
 */
@Component
public class LoginInterceptor implements HandlerInterceptor {
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 获取请求路径
        String requestPath = request.getRequestURI();
        
        // 排除不需要登录验证的路径
        if (isExcludedPath(requestPath)) {
            return true;
        }
        
        // 获取Authorization头
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorizedResponse(response, "缺少认证令牌");
            return false;
        }
        
        // 提取Token
        String token = authHeader.substring(7);
        
        try {
            // 验证Token
            if (!jwtUtil.validateToken(token)) {
                sendUnauthorizedResponse(response, "认证令牌无效或已过期");
                return false;
            }
            
            // 将用户信息存储到请求属性中，供后续使用
            Long userId = jwtUtil.getUserIdFromToken(token);
            String username = jwtUtil.getUsernameFromToken(token);
            
            System.out.println("LoginInterceptor - userId: " + userId + ", username: " + username);
            
            request.setAttribute("userId", userId);
            request.setAttribute("username", username);
            
            return true;
            
        } catch (Exception e) {
            sendUnauthorizedResponse(response, "认证令牌解析失败");
            return false;
        }
    }
    
    /**
     * 检查是否为排除路径
     * @param path 请求路径
     * @return 是否排除
     */
    private boolean isExcludedPath(String path) {
        // 管理员登录接口
        if (path.equals("/api/admin/login")) {
            return true;
        }
        
        // 用户注册和登录接口
        if (path.equals("/api/user/register") || path.equals("/api/user/login")) {
            return true;
        }
        
        // AI对话接口（不需要登录验证）
        if (path.startsWith("/api/ai/")) {
            return true;
        }
        
        // 静态资源
        if (path.startsWith("/static/") || path.startsWith("/css/") || 
            path.startsWith("/js/") || path.startsWith("/images/")) {
            return true;
        }
        
        // 首页
        if (path.equals("/") || path.equals("/index.html")) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 发送未授权响应
     * @param response HTTP响应
     * @param message 错误消息
     * @throws IOException IO异常
     */
    private void sendUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("code", 401);
        result.put("message", message);
        result.put("data", null);
        
        ObjectMapper objectMapper = new ObjectMapper();
        String jsonResponse = objectMapper.writeValueAsString(result);
        
        response.getWriter().write(jsonResponse);
    }
}
