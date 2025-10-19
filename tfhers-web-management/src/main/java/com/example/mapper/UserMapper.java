package com.example.mapper;

import com.example.pojo.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 用户Mapper接口
 */
@Mapper
public interface UserMapper {
    
    /**
     * 根据ID查找用户
     * @param id 用户ID
     * @return 用户信息
     */
    User findById(@Param("id") Long id);
    
    /**
     * 根据ID查找用户（别名方法）
     * @param id 用户ID
     * @return 用户信息
     */
    User selectById(@Param("id") Long id);
    
    /**
     * 根据用户名查找用户
     * @param username 用户名
     * @return 用户信息
     */
    User findByUsername(@Param("username") String username);
    
    /**
     * 根据用户名查找用户（别名方法）
     * @param username 用户名
     * @return 用户信息
     */
    User selectByUsername(@Param("username") String username);
    
    /**
     * 根据邮箱查找用户
     * @param email 邮箱
     * @return 用户信息
     */
    User selectByEmail(@Param("email") String email);
    
    /**
     * 分页查询用户列表
     * @param offset 偏移量
     * @param limit 限制数量
     * @param keyword 搜索关键词
     * @param role 角色筛选
     * @param status 状态筛选
     * @return 用户列表
     */
    List<User> findUsersWithPagination(@Param("offset") int offset, 
                                      @Param("limit") int limit,
                                      @Param("keyword") String keyword,
                                      @Param("role") String role,
                                      @Param("status") Integer status);
    
    /**
     * 统计用户总数
     * @param keyword 搜索关键词
     * @param role 角色筛选
     * @param status 状态筛选
     * @return 用户总数
     */
    int countUsers(@Param("keyword") String keyword,
                   @Param("role") String role,
                   @Param("status") Integer status);
    
    /**
     * 插入新用户
     * @param user 用户信息
     * @return 影响行数
     */
    int insertUser(User user);
    
    /**
     * 更新用户信息
     * @param user 用户信息
     * @return 影响行数
     */
    int updateUser(User user);
    
    /**
     * 更新用户状态
     * @param id 用户ID
     * @param status 状态
     * @return 影响行数
     */
    int updateUserStatus(@Param("id") Long id, @Param("status") Integer status);
    
    /**
     * 更新用户角色
     * @param id 用户ID
     * @param role 角色
     * @return 影响行数
     */
    int updateUserRole(@Param("id") Long id, @Param("role") String role);
    
    /**
     * 重置用户密码
     * @param id 用户ID
     * @param password 新密码
     * @return 影响行数
     */
    int resetUserPassword(@Param("id") Long id, @Param("password") String password);
    
    /**
     * 删除用户
     * @param id 用户ID
     * @return 影响行数
     */
    int deleteUser(@Param("id") Long id);
    
    /**
     * 更新最后登录信息
     * @param id 用户ID
     * @param lastLoginTime 最后登录时间
     * @param lastLoginIp 最后登录IP
     * @return 影响行数
     */
    int updateLastLoginInfo(@Param("id") Long id, 
                           @Param("lastLoginTime") java.time.LocalDateTime lastLoginTime, 
                           @Param("lastLoginIp") String lastLoginIp);
}
