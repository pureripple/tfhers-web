package com.example.service;

import com.example.pojo.AdminUser;

/**
 * 管理员用户服务接口
 */
public interface AdminUserService {
    
    /**
     * 根据用户名查找管理员用户
     * @param username 用户名
     * @return 管理员用户信息
     */
    AdminUser findByUsername(String username);
    
    /**
     * 根据ID查找管理员用户
     * @param id 用户ID
     * @return 管理员用户信息
     */
    AdminUser findById(Long id);
    
    /**
     * 验证管理员登录
     * @param username 用户名
     * @param password 密码
     * @return 登录成功返回用户信息，失败返回null
     */
    AdminUser validateLogin(String username, String password);
    
    /**
     * 更新最后登录信息
     * @param id 用户ID
     * @param lastLoginIp 最后登录IP
     * @return 是否更新成功
     */
    boolean updateLastLoginInfo(Long id, String lastLoginIp);
    
    /**
     * 更新用户信息
     * @param adminUser 管理员用户信息
     * @return 是否更新成功
     */
    boolean updateAdminUser(AdminUser adminUser);
    
    /**
     * 更新用户个人信息
     * @param adminUser 管理员用户信息
     * @return 是否更新成功
     */
    boolean updateProfile(AdminUser adminUser);
}
