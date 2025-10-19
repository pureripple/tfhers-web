package com.example.service.impl;

import com.example.mapper.UserMapper;
import com.example.pojo.User;
import com.example.pojo.results;
import com.example.service.UserService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

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
            // String encodedPassword = passwordEncoder.encode(user.getPassword());
            // user.setPassword(encodedPassword);

            // 设置默认值
            if (user.getRole() == null || user.getRole().isEmpty()) {
                user.setRole("USER");
            }
            if (user.getStatus() == null) {
                user.setStatus(1);
            }
            if (user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty()) {
                user.setAvatarUrl("/images/default-avatar.png");
            }

            // 插入用户
            int result = userMapper.insertUser(user);
            if (result > 0) {
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
            if (!password.equals(user.getPassword())) {
                return new results(400, "用户名或密码错误", null);
            }

            // 检查用户状态
            if (user.getStatus() != 1) {
                return new results(400, "账户已被禁用", null);
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
            // 上传文件到OSS
            String avatarUrl = ossUtil.uploadFile(file, "avatars/");
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
            String avatarUrl = ossUtil.uploadFile(file, "avatars/");
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
            // String encodedPassword = passwordEncoder.encode(user.getPassword());
            // user.setPassword(encodedPassword);

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
            // String encodedPassword = passwordEncoder.encode(newPassword);
            int result = userMapper.resetUserPassword(id, newPassword);
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
}