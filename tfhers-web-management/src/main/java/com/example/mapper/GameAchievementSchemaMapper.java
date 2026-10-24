package com.example.mapper;

import com.example.pojo.GameAchievementSchema;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface GameAchievementSchemaMapper {

    int upsertBatch(@Param("list") List<GameAchievementSchema> list);

    List<GameAchievementSchema> selectByAppId(@Param("appId") Long appId);

    int countByAppId(@Param("appId") Long appId);
}

