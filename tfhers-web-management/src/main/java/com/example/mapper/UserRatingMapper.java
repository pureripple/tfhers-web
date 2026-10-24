package com.example.mapper;

import com.example.pojo.UserRating;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserRatingMapper {
    UserRating findByUserId(@Param("userId") Long userId);

    int insertDefault(@Param("userId") Long userId, @Param("rating") int rating);

    int updateRating(@Param("userId") Long userId,
                     @Param("rating") int rating,
                     @Param("winInc") int winInc,
                     @Param("lossInc") int lossInc);

    List<UserRating> listLeaderboard(@Param("limit") int limit);

    /** 比自己积分高的人数 + 1 = 排名（同分按 user_id 小者靠前） */
    Integer countRank(@Param("userId") Long userId, @Param("rating") int rating);
}