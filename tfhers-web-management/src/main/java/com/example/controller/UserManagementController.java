package com.example.controller;

import com.example.pojo.User;
import com.example.pojo.results;
import com.example.service.UserService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 用户管理控制器
 */
@RestController
@RequestMapping("/api/user-management")
public class UserManagementController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private OssUtil ossUtil;
    
    /**
     * 获取用户列表（分页）
     * @param page 页码
     * @param size 每页大小
     * @param keyword 搜索关键词
     * @param role 角色筛选
     * @param status 状态筛选
     * @return 用户列表
     */
    @GetMapping("/list")
    public results getUserList(@RequestParam(defaultValue = "1") int page,
                              @RequestParam(defaultValue = "10") int size,
                              @RequestParam(required = false) String keyword,
                              @RequestParam(required = false) String role,
                              @RequestParam(required = false) Integer status) {
        try {
            Map<String, Object> data = userService.findUsersWithPagination(page, size, keyword, role, status);
            return results.success("获取用户列表成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取用户列表失败：" + e.getMessage());
        }
    }
    
    /**
     * 根据ID获取用户信息
     * @param id 用户ID
     * @return 用户信息
     */
    @GetMapping("/{id}")
    public results getUserById(@PathVariable Long id) {
        try {
            User user = userService.findById(id);
            if (user == null) {
                return results.error("用户不存在");
            }
            
            // 不返回密码
            user.setPassword(null);
            return results.success("获取用户信息成功", user);
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取用户信息失败：" + e.getMessage());
        }
    }
    
    /**
     * 创建新用户
     * @param createUserRequest 创建用户请求
     * @return 创建结果
     */
    @PostMapping("/create")
    public results createUser(@RequestBody CreateUserRequest createUserRequest) {
        try {
            // 验证参数
            if (createUserRequest.getUsername() == null || createUserRequest.getUsername().trim().isEmpty()) {
                return results.error("用户名不能为空");
            }
            if (createUserRequest.getNickname() == null || createUserRequest.getNickname().trim().isEmpty()) {
                return results.error("昵称不能为空");
            }
            if (createUserRequest.getPassword() == null || createUserRequest.getPassword().trim().isEmpty()) {
                return results.error("密码不能为空");
            }
            
            User user = new User();
            user.setUsername(createUserRequest.getUsername().trim());
            user.setNickname(createUserRequest.getNickname().trim());
            user.setPassword(createUserRequest.getPassword().trim());
            user.setEmail(createUserRequest.getEmail());
            user.setPhone(createUserRequest.getPhone());
            user.setRole(createUserRequest.getRole() != null ? createUserRequest.getRole() : "USER");
            
            boolean success = userService.createUser(user);
            if (success) {
                return results.success("用户创建成功", null);
            } else {
                return results.error("用户创建失败，用户名可能已存在");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("用户创建失败：" + e.getMessage());
        }
    }
    
    /**
     * 更新用户信息
     * @param id 用户ID
     * @param updateUserRequest 更新用户请求
     * @return 更新结果
     */
    @PutMapping("/{id}")
    public results updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest updateUserRequest) {
        try {
            User user = userService.findById(id);
            if (user == null) {
                return results.error("用户不存在");
            }
            
            // 更新用户信息
            if (updateUserRequest.getNickname() != null) {
                user.setNickname(updateUserRequest.getNickname().trim());
            }
            if (updateUserRequest.getEmail() != null) {
                user.setEmail(updateUserRequest.getEmail());
            }
            if (updateUserRequest.getPhone() != null) {
                user.setPhone(updateUserRequest.getPhone());
            }
            
            results updateResult = userService.updateUser(user);
            if (updateResult.getCode() == 200) {
                return results.success("用户信息更新成功", null);
            } else {
                return results.error("用户信息更新失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("用户信息更新失败：" + e.getMessage());
        }
    }
    
    /**
     * 更新用户状态
     * @param id 用户ID
     * @param statusRequest 状态请求
     * @return 更新结果
     */
    @PutMapping("/{id}/status")
    public results updateUserStatus(@PathVariable Long id, @RequestBody StatusRequest statusRequest) {
        try {
            User user = userService.findById(id);
            if (user == null) {
                return results.error("用户不存在");
            }
            
            boolean success = userService.updateUserStatus(id, statusRequest.getStatus());
            if (success) {
                String message = statusRequest.getStatus() == 1 ? "用户已启用" : "用户已禁用";
                return results.success(message, null);
            } else {
                return results.error("用户状态更新失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("用户状态更新失败：" + e.getMessage());
        }
    }
    
    /**
     * 更新用户角色
     * @param id 用户ID
     * @param roleRequest 角色请求
     * @return 更新结果
     */
    @PutMapping("/{id}/role")
    public results updateUserRole(@PathVariable Long id, @RequestBody RoleRequest roleRequest) {
        try {
            User user = userService.findById(id);
            if (user == null) {
                return results.error("用户不存在");
            }
            
            if (!"USER".equals(roleRequest.getRole()) && !"ADMIN".equals(roleRequest.getRole())) {
                return results.error("无效的角色");
            }
            
            boolean success = userService.updateUserRole(id, roleRequest.getRole());
            if (success) {
                String message = "ADMIN".equals(roleRequest.getRole()) ? "用户已设置为管理员" : "用户已设置为普通用户";
                return results.success(message, null);
            } else {
                return results.error("用户角色更新失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("用户角色更新失败：" + e.getMessage());
        }
    }
    
    /**
     * 重置用户密码
     * @param id 用户ID
     * @param passwordRequest 密码请求
     * @return 重置结果
     */
    @PutMapping("/{id}/password")
    public results resetUserPassword(@PathVariable Long id, @RequestBody PasswordRequest passwordRequest) {
        try {
            User user = userService.findById(id);
            if (user == null) {
                return results.error("用户不存在");
            }
            
            if (passwordRequest.getNewPassword() == null || passwordRequest.getNewPassword().trim().isEmpty()) {
                return results.error("新密码不能为空");
            }
            
            boolean success = userService.resetUserPassword(id, passwordRequest.getNewPassword().trim());
            if (success) {
                return results.success("密码重置成功", null);
            } else {
                return results.error("密码重置失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("密码重置失败：" + e.getMessage());
        }
    }
    
    /**
     * 上传用户头像
     * @param id 用户ID
     * @param file 头像文件
     * @return 上传结果
     */
    @PostMapping("/{id}/avatar")
    public results uploadUserAvatar(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            User user = userService.findById(id);
            if (user == null) {
                return results.error("用户不存在");
            }
            
            // 验证文件
            if (file == null || file.isEmpty()) {
                return results.error("请选择要上传的头像文件");
            }
            
            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return results.error("只能上传图片文件");
            }
            
            // 验证文件大小（限制为5MB）
            long maxSize = 5 * 1024 * 1024; // 5MB
            if (file.getSize() > maxSize) {
                return results.error("头像文件大小不能超过5MB");
            }
            
            // 删除旧头像（如果存在）
            if (user.getAvatarUrl() != null && !user.getAvatarUrl().isEmpty()) {
                String oldObjectKey = ossUtil.extractObjectKeyFromUrl(user.getAvatarUrl());
                if (oldObjectKey != null) {
                    ossUtil.deleteFile(oldObjectKey);
                }
            }
            
            // 上传新头像
            String avatarUrl = ossUtil.uploadAvatar(file);
            
            // 更新用户头像URL
            user.setAvatarUrl(avatarUrl);
            results updateResult = userService.updateUser(user);
            
            if (updateResult.getCode() == 200) {
                Map<String, Object> data = new HashMap<>();
                data.put("avatarUrl", avatarUrl);
                return results.success("头像上传成功", data);
            } else {
                return results.error("头像更新失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("头像上传失败：" + e.getMessage());
        }
    }
    
    /**
     * 删除用户
     * @param id 用户ID
     * @return 删除结果
     */
    @DeleteMapping("/{id}")
    public results deleteUser(@PathVariable Long id) {
        try {
            User user = userService.findById(id);
            if (user == null) {
                return results.error("用户不存在");
            }
            
            // 删除用户头像（如果存在）
            if (user.getAvatarUrl() != null && !user.getAvatarUrl().isEmpty()) {
                String objectKey = ossUtil.extractObjectKeyFromUrl(user.getAvatarUrl());
                if (objectKey != null) {
                    ossUtil.deleteFile(objectKey);
                }
            }
            
            boolean success = userService.deleteUser(id);
            if (success) {
                return results.success("用户删除成功", null);
            } else {
                return results.error("用户删除失败");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("用户删除失败：" + e.getMessage());
        }
    }
    
    // 请求实体类
    public static class CreateUserRequest {
        private String username;
        private String nickname;
        private String password;
        private String email;
        private String phone;
        private String role;
        
        // Getter和Setter方法
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getNickname() { return nickname; }
        public void setNickname(String nickname) { this.nickname = nickname; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }
    
    public static class UpdateUserRequest {
        private String nickname;
        private String email;
        private String phone;
        
        // Getter和Setter方法
        public String getNickname() { return nickname; }
        public void setNickname(String nickname) { this.nickname = nickname; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
    }
    
    public static class StatusRequest {
        private Integer status;
        
        public Integer getStatus() { return status; }
        public void setStatus(Integer status) { this.status = status; }
    }
    
    public static class RoleRequest {
        private String role;
        
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }
    
    public static class PasswordRequest {
        private String newPassword;
        
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }
}
