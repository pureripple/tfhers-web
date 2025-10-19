package com.example.service.impl;

import com.example.mapper.AdminUserMapper;
import com.example.pojo.AdminUser;
import com.example.service.AdminUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 管理员用户服务实现类
 */
@Service
public class AdminUserServiceImpl implements AdminUserService {
    
    @Autowired
    private AdminUserMapper adminUserMapper;
    
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
        
        // 检查用户是否存在
        if (adminUser == null) {
            return null;
        }
        
        // 检查用户状态是否正常
        if (adminUser.getStatus() != 1) {
            return null;
        }
        
        // 检查密码是否正确（明文比较）
        if (!password.equals(adminUser.getPassword())) {
            return null;
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
            // 设置更新时间
            adminUser.setUpdatedAt(LocalDateTime.now());
            System.out.println("AdminUserServiceImpl - 准备更新用户信息，用户ID: " + adminUser.getId() + ", 密码: " + adminUser.getPassword());
            int result = adminUserMapper.updateAdminUser(adminUser);
            System.out.println("AdminUserServiceImpl - 数据库更新影响行数: " + result);
            return result > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
