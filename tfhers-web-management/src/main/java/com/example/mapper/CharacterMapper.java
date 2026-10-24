package com.example.mapper;

import com.example.pojo.GameCharacter;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CharacterMapper {

    List<GameCharacter> findAll();

    GameCharacter findById(@Param("id") Long id);

    int insert(GameCharacter character);

    int update(GameCharacter character);

    int deleteById(@Param("id") Long id);
}

