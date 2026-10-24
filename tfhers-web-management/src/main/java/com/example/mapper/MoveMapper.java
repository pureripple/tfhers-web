package com.example.mapper;

import com.example.pojo.Move;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MoveMapper {

    List<Move> findByCharacterId(@Param("characterId") Long characterId);

    Move findById(@Param("id") Long id);

    int insert(Move move);

    int update(Move move);

    int deleteById(@Param("id") Long id);
}

