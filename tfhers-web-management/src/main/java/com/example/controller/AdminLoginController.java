package com.example.controller;

import com.example.pojo.AdminUser;
import com.example.pojo.results;
import com.example.service.AdminUserService;
import com.example.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 管理员登录控制器
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminLoginController {
    
    @Autowired
    private AdminUserService adminUserService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    /**
     * 管理员登录
     * @param loginRequest 登录请求
     * @param request HTTP请求
     * @return 登录结果
     */
    @PostMapping("/login")
    public results login(@RequestBody LoginRequest loginRequest, 
                                            HttpServletRequest request) {
        try {
            // 验证用户名和密码
            AdminUser adminUser = adminUserService.validateLogin(
                loginRequest.getUsername(), 
                loginRequest.getPassword()
            );
            
            if (adminUser == null) {
                return results.error("用户名或密码错误");
            }
            
            // 生成JWT Token
            String token = jwtUtil.generateToken(adminUser.getId(), adminUser.getUsername());

            // 更新最后登录信息
            String clientIp = getClientIpAddress(request);
            adminUserService.updateLastLoginInfo(adminUser.getId(), clientIp);
            
            // 准备返回数据
            Map<String, Object> data = new HashMap<>();
            data.put("token", token);
            data.put("userInfo", Map.of(
                "id", adminUser.getId(),
                "username", adminUser.getUsername(),
                "realName", adminUser.getRealName(),
                "email", adminUser.getEmail(),
                "avatarUrl", adminUser.getAvatarUrl() != null ? adminUser.getAvatarUrl() : ""
            ));
            
            return results.success("登录成功", data);
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("登录失败：" + e.getMessage());
        }
    }
    
    /**
     * 获取当前用户信息
     * @param request HTTP请求
     * @return 用户信息
     */
    @GetMapping("/userinfo")
    public results getUserInfo(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            String username = (String) request.getAttribute("username");
            
            AdminUser adminUser = adminUserService.findById(userId);
            if (adminUser == null) {
                return results.error("用户不存在");
            }
            
            Map<String, Object> data = new HashMap<>();
            data.put("id", adminUser.getId());
            data.put("username", adminUser.getUsername());
            data.put("realName", adminUser.getRealName());
            data.put("email", adminUser.getEmail());
            data.put("phone", adminUser.getPhone());
            data.put("avatarUrl", adminUser.getAvatarUrl() != null ? adminUser.getAvatarUrl() : "");
            data.put("lastLoginTime", adminUser.getLastLoginTime());
            data.put("lastLoginIp", adminUser.getLastLoginIp());
            
            return results.success("获取用户信息成功", data);
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取用户信息失败：" + e.getMessage());
        }
    }
    
    /**
     * 退出登录
     * @return 退出结果
     */
    @PostMapping("/logout")
    public results logout() {
        // JWT是无状态的，客户端删除token即可
        return results.success("退出登录成功", null);
    }
    
    /**
     * 获取客户端IP地址
     * @param request HTTP请求
     * @return 客户端IP
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0];
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    /**
     * 登录请求实体类
     */
    public static class LoginRequest {
        private String username;
        private String password;
        
        public String getUsername() {
            return username;
        }
        
        public void setUsername(String username) {
            this.username = username;
        }
        
        public String getPassword() {
            return password;
        }
        
        public void setPassword(String password) {
            this.password = password;
        }
    }
}
