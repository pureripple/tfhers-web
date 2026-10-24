package com.example.mapper;

import com.example.pojo.UserFeedback;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserFeedbackMapper {
    int insert(UserFeedback feedback);

    List<UserFeedback> selectByUserId(@Param("userId") Long userId,
                                      @Param("offset") int offset,
                                      @Param("limit") int limit);

    int countByUserId(@Param("userId") Long userId);

    List<UserFeedback> selectList(@Param("offset") int offset,
                                  @Param("limit") int limit,
                                  @Param("status") Integer status,
                                  @Param("category") String category);

    int countByFilter(@Param("status") Integer status,
                      @Param("category") String category);

    int updateStatus(@Param("id") Long id,
                     @Param("status") Integer status,
                     @Param("adminReply") String adminReply,
                     @Param("refreshReply") boolean refreshReply);

    UserFeedback selectById(@Param("id") Long id);

    int countUnreadByUserId(@Param("userId") Long userId);

    int markAllReadByUserId(@Param("userId") Long userId);
}

