package com.example.service.impl;

import com.example.mapper.ComboMapper;
import com.example.pojo.Combo;
import com.example.service.ComboService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComboServiceImpl implements ComboService {

    @Autowired
    private ComboMapper comboMapper;

    @Autowired
    private OssUtil ossUtil;

    @Override
    public Combo getComboById(Long id) {
        if (id == null) {
            return null;
        }
        return comboMapper.findById(id);
    }

    @Override
    public List<Combo> getCombosByCharacterId(Long characterId, String status) {
        if (characterId == null) {
            return null;
        }
        if (status == null || status.isEmpty()) {
            return comboMapper.findByCharacterId(characterId);
        }
        return comboMapper.findByCharacterIdAndStatus(characterId, status);
    }

    @Override
    public List<Combo> getCombosByCharacterIdWithAuthor(Long characterId, String status) {
        if (characterId == null) return null;
        return comboMapper.findByCharacterIdAndStatusWithAuthor(characterId, status);
    }

    @Override
    public List<Combo> listByStatus(String status) {
        return comboMapper.findByStatus(status);
    }

    @Override
    public boolean createCombo(Combo combo) {
        if (combo == null || combo.getCharacterId() == null || combo.getCreatedBy() == null) {
            return false;
        }
        return comboMapper.insert(combo) > 0;
    }

    @Override
    public boolean updateComboStatus(Long id, String status) {
        if (id == null || status == null || status.isEmpty()) {
            return false;
        }
        return comboMapper.updateStatus(id, status) > 0;
    }

    @Override
    public boolean deleteCombo(Long id) {
        if (id == null) {
            return false;
        }
        Combo existing = comboMapper.findById(id);
        if (existing != null) {
            if (existing.getVideoUrl() != null) {
                ossUtil.deleteByUrlIfOwned(existing.getVideoUrl());
            }
            if (existing.getComboFileUrl() != null) {
                ossUtil.deleteByUrlIfOwned(existing.getComboFileUrl());
            }
        }
        return comboMapper.deleteById(id) > 0;
    }

    @Override
    public List<Combo> listByUserId(Long userId) {
        if (userId == null) {
            return java.util.Collections.emptyList();
        }
        return comboMapper.findByCreatedBy(userId);
    }

    @Override
    public boolean deleteComboByOwner(Long id, Long userId) {
        if (id == null || userId == null) {
            return false;
        }
        Combo existing = comboMapper.findById(id);
        if (existing == null || existing.getCreatedBy() == null || !existing.getCreatedBy().equals(userId)) {
            return false;
        }
        return deleteCombo(id);
    }

}
