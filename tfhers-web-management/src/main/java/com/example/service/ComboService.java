package com.example.service;

import com.example.pojo.Combo;

import java.util.List;

public interface ComboService {

    Combo getComboById(Long id);

    List<Combo> getCombosByCharacterId(Long characterId, String status);

    /** 按角色与状态查询玩家连段，带发布者昵称与头像（用于前台展示） */
    List<Combo> getCombosByCharacterIdWithAuthor(Long characterId, String status);

    /** 按状态列出用户连段（status 为空则全部） */
    List<Combo> listByStatus(String status);

    boolean createCombo(Combo combo);

    boolean updateComboStatus(Long id, String status);

    boolean deleteCombo(Long id);

    List<Combo> listByUserId(Long userId);

    /** 仅创建者可删 */
    boolean deleteComboByOwner(Long id, Long userId);
}


