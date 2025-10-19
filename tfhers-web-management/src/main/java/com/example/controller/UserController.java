package com.example.controller;

import com.example.pojo.User;
import com.example.pojo.results;
import com.example.service.UserService;
import com.example.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * 用户注册
     */
    @PostMapping(value = "/register", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> register(
            @RequestParam("username") String username,
            @RequestParam("nickname") String nickname,
            @RequestParam("password") String password,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "avatar", required = false) MultipartFile avatar) {
        
        try {
            // 创建用户对象
            User user = new User();
            user.setUsername(username);
            user.setNickname(nickname);
            user.setPassword(password);
            user.setEmail(email);
            user.setPhone(phone);
            user.setRole("USER"); // 设置默认角色
            user.setStatus(1); // 设置默认状态为启用
            
            // 如果有头像文件，先上传头像
            if (avatar != null && !avatar.isEmpty()) {
                results uploadResult = userService.uploadAvatarForRegistration(avatar);
                if (uploadResult.getCode() == 200) {
                    user.setAvatarUrl((String) uploadResult.getData());
                }
            }
            
            results result = userService.register(user);
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            
            if (result.getCode() == 200) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("msg", "注册失败: " + e.getMessage());
            response.put("data", null);
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginData) {
        String username = loginData.get("username");
        String password = loginData.get("password");
        
        results result = userService.login(username, password);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        
        if (result.getCode() == 200) {
            User user = (User) result.getData();
            // 生成JWT token
            String token = jwtUtil.generateToken(user.getId(), user.getUsername());
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("nickname", user.getNickname());
            userData.put("email", user.getEmail());
            userData.put("phone", user.getPhone());
            userData.put("avatarUrl", user.getAvatarUrl());
            userData.put("token", token);
            
            response.put("data", userData);
            return ResponseEntity.ok(response);
        } else {
            response.put("data", null);
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 上传头像
     */
    @PostMapping("/upload-avatar")
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String token) {
        
        try {
            // 验证token
            if (!jwtUtil.validateToken(token.substring(7))) {
                return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "认证失败",
                    "data", null
                ));
            }
            
            Long userId = jwtUtil.getUserIdFromToken(token.substring(7));
            results result = userService.uploadAvatar(userId, file);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            
            if (result.getCode() == 200) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "上传失败: " + e.getMessage(),
                "data", null
            ));
        }
    }

    /**
     * 获取用户信息
     */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader("Authorization") String token) {
        try {
            // 验证token
            if (!jwtUtil.validateToken(token.substring(7))) {
                return ResponseEntity.status(401).body(Map.of(
                    "code", 401,
                    "msg", "认证失败",
                    "data", null
                ));
            }
            
            Long userId = jwtUtil.getUserIdFromToken(token.substring(7));
            results result = userService.getUserById(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", result.getCode());
            response.put("msg", result.getMsg());
            response.put("data", result.getData());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "msg", "获取用户信息失败: " + e.getMessage(),
                "data", null
            ));
        }
    }
}
