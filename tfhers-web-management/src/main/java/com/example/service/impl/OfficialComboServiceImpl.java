package com.example.service.impl;

import com.example.mapper.OfficialComboMapper;
import com.example.pojo.OfficialCombo;
import com.example.service.OfficialComboService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OfficialComboServiceImpl implements OfficialComboService {

    @Autowired
    private OfficialComboMapper officialComboMapper;

    @Override
    public OfficialCombo getById(Long id) {
        if (id == null) {
            return null;
        }
        return officialComboMapper.findById(id);
    }

    @Override
    public List<OfficialCombo> getByCharacterId(Long characterId) {
        if (characterId == null) {
            return null;
        }
        return officialComboMapper.findByCharacterId(characterId);
    }

    @Override
    public boolean create(OfficialCombo combo) {
        if (combo == null || combo.getCharacterId() == null) {
            return false;
        }
        return officialComboMapper.insert(combo) > 0;
    }

    @Override
    public boolean update(OfficialCombo combo) {
        if (combo == null || combo.getId() == null) {
            return false;
        }
        return officialComboMapper.update(combo) > 0;
    }

    @Override
    public boolean delete(Long id) {
        if (id == null) {
            return false;
        }
        return officialComboMapper.deleteById(id) > 0;
    }
}

