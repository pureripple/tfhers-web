package com.example.mapper;

import com.example.pojo.SteamPlaytimeHistory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

@Mapper
public interface SteamPlaytimeHistoryMapper {

    int insert(SteamPlaytimeHistory history);

    SteamPlaytimeHistory selectLatestBefore(@Param("userId") Long userId,
                                             @Param("time") LocalDateTime time);
}

