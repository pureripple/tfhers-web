package com.example.service.impl;

import com.example.mapper.UserMapper;
import com.example.mapper.UserRatingMapper;
import com.example.util.EloUtil;
import com.example.pojo.User;
import com.example.pojo.results;
import com.example.service.UserService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private UserRatingMapper userRatingMapper;

    @Autowired
    private OssUtil ossUtil;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Override
    public results register(User user) {
        try {
            // 检查用户名是否已存在
            User existingUser = userMapper.selectByUsername(user.getUsername());
            if (existingUser != null) {
                return new results(400, "用户名已存在", null);
            }

            // 检查邮箱是否已存在
            if (user.getEmail() != null && !user.getEmail().isEmpty()) {
                User existingEmail = userMapper.selectByEmail(user.getEmail());
                if (existingEmail != null) {
                    return new results(400, "邮箱已被使用", null);
                }
            }

            // 暂时不加密密码（测试用）
            String encodedPassword = passwordEncoder.encode(user.getPassword());
            user.setPassword(encodedPassword);

            // 设置默认值
            if (user.getRole() == null || user.getRole().isEmpty()) {
                user.setRole("USER");
            }
            if (user.getStatus() == null) {
                user.setStatus(1);
            }
            if (user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty()) {
                user.setAvatarUrl("/images/CSel3_LargePortTianhuo.png");
            }

            // 插入用户
            int result = userMapper.insertUser(user);
            if (result > 0) {
                try {
                    if (user.getId() != null) {
                        userRatingMapper.insertDefault(user.getId(), EloUtil.DEFAULT_RATING);
                    }
                } catch (Exception ignore) { }
                // 清除密码后返回
                user.setPassword(null);
                return new results(200, "注册成功", user);
            } else {
                return new results(500, "注册失败", null);
            }
        } catch (Exception e) {
            return new results(500, "注册失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results login(String username, String password) {
        try {
            // 根据用户名查找用户
            User user = userMapper.selectByUsername(username);
            if (user == null) {
                return new results(400, "用户名或密码错误", null);
            }

            // 暂时使用明文密码验证（测试用）
            if (!matchesStoredPassword(password, user.getPassword())) {
                return new results(400, "用户名或密码错误", null);
            }

            // 检查用户状态
            if (user.getStatus() != 1) {
                return new results(400, "账户已被禁用", null);
            }

            // 更新最后登录时间（和可选的登录IP，这里先不处理IP）
            LocalDateTime now = LocalDateTime.now();
            try {
                userMapper.updateLastLoginInfo(user.getId(), now, null);
                // 同步更新返回给前端的对象，避免本次会话看到还是null
                user.setLastLoginTime(now);
            } catch (Exception e) {
                // 这里不影响登录主流程，只打印日志即可（如果后续加日志系统可以记录下来）
                e.printStackTrace();
            }

            // 清除密码后返回
            user.setPassword(null);
            return new results(200, "登录成功", user);
        } catch (Exception e) {
            return new results(500, "登录失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results getUserById(Long id) {
        try {
            User user = userMapper.selectById(id);
            if (user != null) {
                // 清除密码后返回
                user.setPassword(null);
                return new results(200, "获取成功", user);
            } else {
                return new results(404, "用户不存在", null);
            }
        } catch (Exception e) {
            return new results(500, "获取用户信息失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results uploadAvatar(Long userId, MultipartFile file) {
        try {
            User existing = userMapper.findById(userId);
            if (existing == null) {
                existing = userMapper.selectById(userId);
            }
            if (existing != null && existing.getAvatarUrl() != null && !existing.getAvatarUrl().isBlank()) {
                ossUtil.deleteByUrlIfOwned(existing.getAvatarUrl());
            }
            // 上传文件到OSS
            String avatarUrl = ossUtil.uploadFile(file, "avatars");
            if (avatarUrl == null) {
                return new results(500, "头像上传失败", null);
            }

            // 更新用户头像URL
            User user = new User();
            user.setId(userId);
            user.setAvatarUrl(avatarUrl);
            
            int result = userMapper.updateUser(user);
            if (result > 0) {
                return new results(200, "头像上传成功", avatarUrl);
            } else {
                return new results(500, "头像更新失败", null);
            }
        } catch (Exception e) {
            return new results(500, "头像上传失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results uploadAvatarForRegistration(MultipartFile file) {
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                return new results(400, "请选择要上传的头像文件", null);
            }

            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return new results(400, "只能上传图片文件", null);
            }

            // 验证文件大小（限制为5MB）
            long maxSize = 5 * 1024 * 1024; // 5MB
            if (file.getSize() > maxSize) {
                return new results(400, "头像文件大小不能超过5MB", null);
            }

            // 直接上传头像，返回URL
            String avatarUrl = ossUtil.uploadFile(file, "avatars");
            if (avatarUrl == null) {
                return new results(500, "头像上传失败", null);
            }
            
            return new results(200, "头像上传成功", avatarUrl);
        } catch (Exception e) {
            return new results(500, "头像上传失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results updateUser(User user) {
        try {
            int result = userMapper.updateUser(user);
            if (result > 0) {
                // 清除密码后返回
                user.setPassword(null);
                return new results(200, "更新成功", user);
            } else {
                return new results(500, "更新失败", null);
            }
        } catch (Exception e) {
            return new results(500, "更新失败: " + e.getMessage(), null);
        }
    }

    @Override
    public Map<String, Object> findUsersWithPagination(int page, int size, String keyword, String role, Integer status) {
        try {
            int offset = (page - 1) * size;
            List<User> users = userMapper.findUsersWithPagination(offset, size, keyword, role, status);
            int total = userMapper.countUsers(keyword, role, status);
            
            Map<String, Object> result = new HashMap<>();
            result.put("users", users);
            result.put("total", total);
            result.put("page", page);
            result.put("size", size);
            result.put("totalPages", (int) Math.ceil((double) total / size));
            
            return result;
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("users", List.of());
            result.put("total", 0);
            result.put("page", page);
            result.put("size", size);
            result.put("totalPages", 0);
            return result;
        }
    }

    @Override
    public User findById(Long id) {
        try {
            return userMapper.findById(id);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public boolean createUser(User user) {
        try {
            // 检查用户名是否已存在
            User existingUser = userMapper.selectByUsername(user.getUsername());
            if (existingUser != null) {
                return false;
            }

            // 暂时不加密密码（测试用）
            String encodedPassword = passwordEncoder.encode(user.getPassword());
            user.setPassword(encodedPassword);

            // 设置默认值
            if (user.getRole() == null) {
                user.setRole("USER");
            }
            if (user.getStatus() == null) {
                user.setStatus(1);
            }

            int result = userMapper.insertUser(user);
            return result > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean updateUserStatus(Long id, Integer status) {
        try {
            int result = userMapper.updateUserStatus(id, status);
            return result > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean updateUserRole(Long id, String role) {
        try {
            int result = userMapper.updateUserRole(id, role);
            return result > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean resetUserPassword(Long id, String newPassword) {
        try {
            // 暂时不加密密码（测试用）
            String encodedPassword = passwordEncoder.encode(newPassword);
            int result = userMapper.resetUserPassword(id, encodedPassword);
            return result > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean deleteUser(Long id) {
        try {
            int result = userMapper.deleteUser(id);
            return result > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public results bindSteam(Long userId, String steamId) {
        try {
            if (userId == null || steamId == null || steamId.isEmpty()) {
                return new results(400, "参数无效", null);
            }
            User user = new User();
            user.setId(userId);
            try {
                user.setSteamId(Long.parseLong(steamId));
            } catch (NumberFormatException e) {
                return new results(400, "无效的 Steam ID", null);
            }
            int updated = userMapper.updateUser(user);
            if (updated > 0) {
                return new results(200, "绑定 Steam 成功", null);
            } else {
                return new results(500, "绑定 Steam 失败", null);
            }
        } catch (Exception e) {
            return new results(500, "绑定 Steam 失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results unbindSteam(Long userId) {
        try {
            if (userId == null) {
                return new results(400, "参数无效", null);
            }
            int updated = userMapper.clearSteamBinding(userId);
            if (updated > 0) {
                return new results(200, "已解除 Steam 绑定", null);
            } else {
                return new results(500, "解除 Steam 绑定失败", null);
            }
        } catch (Exception e) {
            return new results(500, "解除 Steam 绑定失败: " + e.getMessage(), null);
        }
    }

    /**
     * 兼容历史明文密码与 BCrypt 哈希
     */
    private boolean matchesStoredPassword(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }
        if (storedPassword.startsWith("$2a$")
                || storedPassword.startsWith("$2b$")
                || storedPassword.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return rawPassword.equals(storedPassword);
    }

    @Override
    public results updateCommunityProfile(Long userId, String nickname, String email, String phone, String signature,
                                            String gender, String birthday, String coverUrl) {
        try {
            if (userId == null) {
                return new results(401, "用户未登录", null);
            }
            User existing = userMapper.selectById(userId);
            if (existing == null) {
                return new results(404, "用户不存在", null);
            }
            if (nickname == null || nickname.trim().isEmpty()) {
                return new results(400, "昵称不能为空", null);
            }
            nickname = nickname.trim();
            if (nickname.length() > 100) {
                return new results(400, "昵称长度不能超过100个字符", null);
            }

            String emailVal = email == null ? null : email.trim();
            if (emailVal != null && emailVal.isEmpty()) {
                emailVal = "";
            }
            if (emailVal != null && !emailVal.isEmpty()) {
                if (emailVal.length() > 100) {
                    return new results(400, "邮箱长度不能超过100个字符", null);
                }
                User byEmail = userMapper.selectByEmail(emailVal);
                if (byEmail != null && !byEmail.getId().equals(userId)) {
                    return new results(400, "邮箱已被其他账号使用", null);
                }
            }

            String phoneVal = phone == null ? null : phone.trim();
            if (phoneVal != null && phoneVal.length() > 20) {
                return new results(400, "手机号长度不能超过20个字符", null);
            }

            String sigVal = signature == null ? "" : signature.trim();
            if (sigVal.length() > 200) {
                return new results(400, "个性签名不能超过200个字符", null);
            }

            User patch = new User();
            patch.setId(userId);
            patch.setNickname(nickname);
            if (emailVal != null) {
                patch.setEmail(emailVal);
            }
            if (phoneVal != null) {
                patch.setPhone(phoneVal);
            }
            patch.setSignature(sigVal);

            String genderVal = gender == null ? null : gender.trim();
            if (genderVal != null) {
                if (genderVal.isEmpty()) {
                    genderVal = "保密";
                }
                if (!("保密".equals(genderVal) || "男".equals(genderVal) || "女".equals(genderVal))) {
                    return new results(400, "性别取值无效", null);
                }
                patch.setGender(genderVal);
            }

            // birthday: null = 不改；"" / "clear" = 清空；否则 yyyy-MM-dd
            if (birthday != null) {
                String b = birthday.trim();
                if (b.isEmpty() || "clear".equalsIgnoreCase(b)) {
                    patch.setClearBirthday(true);
                } else {
                    try {
                        patch.setBirthday(java.time.LocalDate.parse(b));
                    } catch (Exception ex) {
                        return new results(400, "生日格式应为 yyyy-MM-dd", null);
                    }
                }
            }

            if (coverUrl != null) {
                patch.setCoverUrl(coverUrl.trim());
            }

            int updated = userMapper.updateUser(patch);
            if (updated <= 0) {
                return new results(500, "更新失败", null);
            }
            User fresh = userMapper.selectById(userId);
            if (fresh != null) {
                fresh.setPassword(null);
            }
            return new results(200, "个人资料更新成功", fresh);
        } catch (Exception e) {
            return new results(500, "更新失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results uploadCover(Long userId, org.springframework.web.multipart.MultipartFile file) {
        try {
            if (userId == null) {
                return new results(401, "用户未登录", null);
            }
            if (file == null || file.isEmpty()) {
                return new results(400, "请选择封面图片", null);
            }
            String ct = file.getContentType();
            if (ct == null || !(ct.startsWith("image/"))) {
                return new results(400, "封面必须是图片文件", null);
            }
            if (file.getSize() > 8L * 1024 * 1024) {
                return new results(400, "封面图片不能超过 8MB", null);
            }
            User existing = userMapper.selectById(userId);
            if (existing == null) {
                return new results(404, "用户不存在", null);
            }
            if (existing.getCoverUrl() != null && !existing.getCoverUrl().isBlank()) {
                ossUtil.deleteByUrlIfOwned(existing.getCoverUrl());
            }
            String coverUrl = ossUtil.uploadFile(file, "covers");
            if (coverUrl == null) {
                return new results(500, "封面上传失败", null);
            }
            User patch = new User();
            patch.setId(userId);
            patch.setCoverUrl(coverUrl);
            int updated = userMapper.updateUser(patch);
            if (updated <= 0) {
                return new results(500, "保存封面失败", null);
            }
            return new results(200, "封面上传成功", coverUrl);
        } catch (Exception e) {
            return new results(500, "封面上传失败: " + e.getMessage(), null);
        }
    }

    @Override
    public results changePassword(Long userId, String oldPassword, String newPassword) {
        try {
            if (userId == null) {
                return new results(401, "用户未登录", null);
            }
            if (oldPassword == null || oldPassword.isEmpty()) {
                return new results(400, "请输入当前密码", null);
            }
            if (newPassword == null || newPassword.isEmpty()) {
                return new results(400, "请输入新密码", null);
            }
            if (newPassword.length() < 6) {
                return new results(400, "新密码长度不能少于6位", null);
            }
            if (newPassword.length() > 64) {
                return new results(400, "新密码长度不能超过64位", null);
            }
            if (oldPassword.equals(newPassword)) {
                return new results(400, "新密码不能与当前密码相同", null);
            }

            User user = userMapper.selectById(userId);
            if (user == null) {
                return new results(404, "用户不存在", null);
            }
            if (!matchesStoredPassword(oldPassword, user.getPassword())) {
                return new results(400, "当前密码不正确", null);
            }

            String encoded = passwordEncoder.encode(newPassword);
            int updated = userMapper.resetUserPassword(userId, encoded);
            if (updated > 0) {
                return new results(200, "密码修改成功", null);
            }
            return new results(500, "密码修改失败", null);
        } catch (Exception e) {
            return new results(500, "密码修改失败: " + e.getMessage(), null);
        }
    }
}
