package com.example.controller;

import com.example.pojo.AdminUser;
import com.example.pojo.results;
import com.example.service.AdminUserService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 个人设置控制器
 */
@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "*")
public class ProfileController {
    
    @Autowired
    private AdminUserService adminUserService;
    
    @Autowired
    private OssUtil ossUtil;
    
    /**
     * 获取当前用户信息
     * @param request HTTP请求
     * @return 用户信息
     */
    @GetMapping("/info")
    public results getProfileInfo(HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");

            if (userId == null) {
                return results.error("用户未登录");
            }
            
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
            data.put("avatarUrl", adminUser.getAvatarUrl());
            data.put("lastLoginTime", adminUser.getLastLoginTime());
            data.put("lastLoginIp", adminUser.getLastLoginIp());
            data.put("createdAt", adminUser.getCreatedAt());
            
            return results.success("获取用户信息成功", data);
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("获取用户信息失败：" + e.getMessage());
        }
    }
    
    /**
     * 更新用户基本信息
     * @param request HTTP请求
     * @param updateRequest 更新请求
     * @return 更新结果
     */
    @PutMapping("/update")
    public results updateProfile(HttpServletRequest request, @RequestBody UpdateProfileRequest updateRequest) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error("用户未登录");
            }
            
            AdminUser adminUser = adminUserService.findById(userId);
            if (adminUser == null) {
                return results.error("用户不存在");
            }
            
            // 更新用户信息
            if (updateRequest.getRealName() != null) {
                adminUser.setRealName(updateRequest.getRealName());
            }
            if (updateRequest.getEmail() != null) {
                adminUser.setEmail(updateRequest.getEmail());
            }
            if (updateRequest.getPhone() != null) {
                adminUser.setPhone(updateRequest.getPhone());
            }
            
            boolean success = adminUserService.updateProfile(adminUser);
            if (success) {
                return results.success("个人信息更新成功", null);
            } else {
                return results.error("个人信息更新失败");
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("个人信息更新失败：" + e.getMessage());
        }
    }
    
    /**
     * 上传头像
     * @param request HTTP请求
     * @param file 头像文件
     * @return 上传结果
     */
    @PostMapping("/avatar/upload")
    public results uploadAvatar(HttpServletRequest request, @RequestParam("file") MultipartFile file) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error("用户未登录");
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
            
            // 获取当前用户信息
            AdminUser adminUser = adminUserService.findById(userId);
            if (adminUser == null) {
                return results.error("用户不存在");
            }
            
            // 删除旧头像（如果存在）
            if (adminUser.getAvatarUrl() != null && !adminUser.getAvatarUrl().isEmpty()) {
                String oldObjectKey = ossUtil.extractObjectKeyFromUrl(adminUser.getAvatarUrl());
                if (oldObjectKey != null) {
                    ossUtil.deleteFile(oldObjectKey);
                }
            }
            
            // 上传新头像
            String avatarUrl = ossUtil.uploadAvatar(file);
            
            // 更新用户头像URL
            adminUser.setAvatarUrl(avatarUrl);
            boolean success = adminUserService.updateProfile(adminUser);
            
            if (success) {
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
     * 修改密码
     * @param request HTTP请求
     * @param changePasswordRequest 修改密码请求
     * @return 修改结果
     */
    @PutMapping("/password/change")
    public results changePassword(HttpServletRequest request, @RequestBody ChangePasswordRequest changePasswordRequest) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return results.error("用户未登录");
            }
            
            // 验证参数
            if (changePasswordRequest.getOldPassword() == null || changePasswordRequest.getOldPassword().isEmpty()) {
                return results.error("请输入当前密码");
            }
            if (changePasswordRequest.getNewPassword() == null || changePasswordRequest.getNewPassword().isEmpty()) {
                return results.error("请输入新密码");
            }
            if (changePasswordRequest.getNewPassword().length() < 6) {
                return results.error("新密码长度不能少于6位");
            }
            if (!changePasswordRequest.getNewPassword().equals(changePasswordRequest.getConfirmPassword())) {
                return results.error("新密码和确认密码不一致");
            }
            
            // 验证当前密码
            AdminUser adminUser = adminUserService.findById(userId);
            if (adminUser == null) {
                return results.error("用户不存在");
            }
            
            // 验证当前密码是否正确
            if (!changePasswordRequest.getOldPassword().equals(adminUser.getPassword())) {
                return results.error("当前密码不正确");
            }
            
            // 设置新密码
            adminUser.setPassword(changePasswordRequest.getNewPassword());
            boolean success = adminUserService.updateProfile(adminUser);
            
            if (success) {
                return results.success("密码修改成功", null);
            } else {
                return results.error("密码修改失败");
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("密码修改失败：" + e.getMessage());
        }
    }
    
    /**
     * 更新个人信息请求实体类
     */
    public static class UpdateProfileRequest {
        private String realName;
        private String email;
        private String phone;
        
        public String getRealName() {
            return realName;
        }
        
        public void setRealName(String realName) {
            this.realName = realName;
        }
        
        public String getEmail() {
            return email;
        }
        
        public void setEmail(String email) {
            this.email = email;
        }
        
        public String getPhone() {
            return phone;
        }
        
        public void setPhone(String phone) {
            this.phone = phone;
        }
    }
    
    /**
     * 修改密码请求实体类
     */
    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;
        private String confirmPassword;
        
        public String getOldPassword() {
            return oldPassword;
        }
        
        public void setOldPassword(String oldPassword) {
            this.oldPassword = oldPassword;
        }
        
        public String getNewPassword() {
            return newPassword;
        }
        
        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }
        
        public String getConfirmPassword() {
            return confirmPassword;
        }
        
        public void setConfirmPassword(String confirmPassword) {
            this.confirmPassword = confirmPassword;
        }
    }
}
