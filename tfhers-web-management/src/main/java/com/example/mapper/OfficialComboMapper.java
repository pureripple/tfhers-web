package com.example.mapper;

import com.example.pojo.OfficialCombo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OfficialComboMapper {

    OfficialCombo findById(@Param("id") Long id);

    List<OfficialCombo> findByCharacterId(@Param("characterId") Long characterId);

    int insert(OfficialCombo combo);

    int update(OfficialCombo combo);

    int deleteById(@Param("id") Long id);
}

