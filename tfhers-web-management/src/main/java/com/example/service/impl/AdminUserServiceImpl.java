package com.example.service.impl;

import com.example.mapper.AdminUserMapper;
import com.example.pojo.AdminUser;
import com.example.service.AdminUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 管理员用户服务实现类
 */
@Service
public class AdminUserServiceImpl implements AdminUserService {

    @Autowired
    private AdminUserMapper adminUserMapper;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Override
    public AdminUser findByUsername(String username) {
        return adminUserMapper.findByUsername(username);
    }

    @Override
    public AdminUser findById(Long id) {
        return adminUserMapper.findById(id);
    }

    @Override
    public AdminUser validateLogin(String username, String password) {
        AdminUser adminUser = adminUserMapper.findByUsername(username);

        if (adminUser == null) {
            return null;
        }

        if (adminUser.getStatus() == null || adminUser.getStatus() != 1) {
            return null;
        }

        String stored = adminUser.getPassword();
        if (!matchesStoredPassword(password, stored)) {
            return null;
        }

        // 存量明文：比对成功后懒升级为 BCrypt（strength 与用户侧一致，均为 12）
        if (stored != null && !isBcryptHash(stored)) {
            try {
                AdminUser upgrade = new AdminUser();
                upgrade.setId(adminUser.getId());
                upgrade.setPassword(passwordEncoder.encode(password));
                adminUserMapper.updateAdminUser(upgrade);
                adminUser.setPassword(upgrade.getPassword());
            } catch (Exception e) {
                // 升级失败不影响本次登录
                e.printStackTrace();
            }
        }

        return adminUser;
    }

    @Override
    public boolean updateLastLoginInfo(Long id, String lastLoginIp) {
        try {
            int result = adminUserMapper.updateLastLoginInfo(id, LocalDateTime.now(), lastLoginIp);
            return result > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    @Override
    public boolean updateAdminUser(AdminUser adminUser) {
        try {
            encodePasswordIfPlain(adminUser);
            int result = adminUserMapper.updateAdminUser(adminUser);
            return result > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    @Override
    public boolean updateProfile(AdminUser adminUser) {
        try {
            adminUser.setUpdatedAt(LocalDateTime.now());
            // 仅当传入明文密码时才哈希；已是 BCrypt 的不二次加密（避免 findById 后再更新资料时毁掉哈希）
            encodePasswordIfPlain(adminUser);
            int result = adminUserMapper.updateAdminUser(adminUser);
            return result > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    @Override
    public boolean changePassword(Long id, String oldPassword, String newPassword) {
        if (id == null || oldPassword == null || newPassword == null) {
            return false;
        }
        AdminUser adminUser = adminUserMapper.findById(id);
        if (adminUser == null) {
            return false;
        }
        if (!matchesStoredPassword(oldPassword, adminUser.getPassword())) {
            return false;
        }
        AdminUser patch = new AdminUser();
        patch.setId(id);
        patch.setPassword(passwordEncoder.encode(newPassword));
        patch.setUpdatedAt(LocalDateTime.now());
        return adminUserMapper.updateAdminUser(patch) > 0;
    }

    /**
     * 建管/改密：若 password 为明文则改为 BCrypt 后再落库。
     */
    private void encodePasswordIfPlain(AdminUser adminUser) {
        if (adminUser == null) {
            return;
        }
        String pwd = adminUser.getPassword();
        if (pwd == null || pwd.isEmpty()) {
            return;
        }
        if (!isBcryptHash(pwd)) {
            adminUser.setPassword(passwordEncoder.encode(pwd));
        }
    }

    private boolean matchesStoredPassword(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }
        if (isBcryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return rawPassword.equals(storedPassword);
    }

    private boolean isBcryptHash(String storedPassword) {
        return storedPassword.startsWith("$2a$")
                || storedPassword.startsWith("$2b$")
                || storedPassword.startsWith("$2y$");
    }
}
