package com.example.mapper;

import com.example.pojo.RatingHistory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface RatingHistoryMapper {
    int insert(RatingHistory history);

    int countByUserAndMatch(@Param("userId") Long userId, @Param("matchId") Long matchId);

    int countByMatch(@Param("matchId") Long matchId);
}