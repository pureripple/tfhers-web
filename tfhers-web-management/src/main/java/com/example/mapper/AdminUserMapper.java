package com.example.mapper;

import com.example.pojo.AdminUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 管理员用户Mapper接口
 */
@Mapper
public interface AdminUserMapper {
    
    /**
     * 根据用户名查找管理员用户
     * @param username 用户名
     * @return 管理员用户信息
     */
    AdminUser findByUsername(@Param("username") String username);
    
    /**
     * 根据ID查找管理员用户
     * @param id 用户ID
     * @return 管理员用户信息
     */
    AdminUser findById(@Param("id") Long id);
    
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
    
    /**
     * 更新用户信息
     * @param adminUser 管理员用户信息
     * @return 影响行数
     */
    int updateAdminUser(AdminUser adminUser);
    
    /**
     * 插入新管理员用户
     * @param adminUser 管理员用户信息
     * @return 影响行数
     */
    int insertAdminUser(AdminUser adminUser);
}
