package com.example.mapper;

import com.example.pojo.Combo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ComboMapper {

    Combo findById(@Param("id") Long id);

    List<Combo> findByCharacterId(@Param("characterId") Long characterId);

    List<Combo> findByCharacterIdAndStatus(@Param("characterId") Long characterId,
                                           @Param("status") String status);

    /** 按角色与状态查询，并带发布者昵称、头像 */
    List<Combo> findByCharacterIdAndStatusWithAuthor(@Param("characterId") Long characterId,
                                                     @Param("status") String status);

    /** 按状态筛选列表（status 为空则查全部） */
    List<Combo> findByStatus(@Param("status") String status);

    int insert(Combo combo);

    int updateStatus(@Param("id") Long id, @Param("status") String status);

    int deleteById(@Param("id") Long id);

    /** 当前用户提交的连段（含角色名） */
    List<Combo> findByCreatedBy(@Param("userId") Long userId);
}


