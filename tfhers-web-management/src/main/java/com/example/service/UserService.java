package com.example.service;

import com.example.pojo.User;
import com.example.pojo.results;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface UserService {
    /**
     * 用户注册
     * @param user 用户信息
     * @return 注册结果
     */
    results register(User user);
    
    /**
     * 用户登录
     * @param username 用户名
     * @param password 密码
     * @return 登录结果
     */
    results login(String username, String password);
    
    /**
     * 根据ID获取用户信息
     * @param id 用户ID
     * @return 用户信息
     */
    results getUserById(Long id);
    
    /**
     * 上传头像
     * @param userId 用户ID
     * @param file 头像文件
     * @return 上传结果
     */
    results uploadAvatar(Long userId, MultipartFile file);
    
    /**
     * 上传头像（注册时使用）
     * @param file 头像文件
     * @return 上传结果
     */
    results uploadAvatarForRegistration(MultipartFile file);
    
    /**
     * 更新用户信息
     * @param user 用户信息
     * @return 更新结果
     */
    results updateUser(User user);
    
    /**
     * 分页查询用户列表
     * @param page 页码
     * @param size 每页大小
     * @param keyword 搜索关键词
     * @param role 角色筛选
     * @param status 状态筛选
     * @return 用户列表
     */
    Map<String, Object> findUsersWithPagination(int page, int size, String keyword, String role, Integer status);
    
    /**
     * 根据ID查找用户
     * @param id 用户ID
     * @return 用户信息
     */
    User findById(Long id);
    
    /**
     * 创建用户
     * @param user 用户信息
     * @return 是否成功
     */
    boolean createUser(User user);
    
    /**
     * 更新用户状态
     * @param id 用户ID
     * @param status 状态
     * @return 是否成功
     */
    boolean updateUserStatus(Long id, Integer status);
    
    /**
     * 更新用户角色
     * @param id 用户ID
     * @param role 角色
     * @return 是否成功
     */
    boolean updateUserRole(Long id, String role);
    
    /**
     * 重置用户密码
     * @param id 用户ID
     * @param newPassword 新密码
     * @return 是否成功
     */
    boolean resetUserPassword(Long id, String newPassword);
    
    /**
     * 删除用户
     * @param id 用户ID
     * @return 是否成功
     */
    boolean deleteUser(Long id);
}