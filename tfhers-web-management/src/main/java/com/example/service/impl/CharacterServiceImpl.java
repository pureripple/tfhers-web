package com.example.service.impl;

import com.example.mapper.CharacterMapper;
import com.example.mapper.ComboMapper;
import com.example.mapper.MoveMapper;
import com.example.pojo.Combo;
import com.example.pojo.GameCharacter;
import com.example.pojo.Move;
import com.example.service.CharacterService;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CharacterServiceImpl implements CharacterService {

    @Autowired
    private CharacterMapper characterMapper;

    @Autowired
    private MoveMapper moveMapper;

    @Autowired
    private ComboMapper comboMapper;

    @Autowired
    private OssUtil ossUtil;

    @Override
    public List<GameCharacter> getAllCharacters() {
        return characterMapper.findAll();
    }

    @Override
    public GameCharacter getCharacterById(Long id) {
        if (id == null) {
            return null;
        }
        return characterMapper.findById(id);
    }

    @Override
    public boolean createCharacter(GameCharacter character) {
        if (character == null) {
            return false;
        }
        return characterMapper.insert(character) > 0;
    }

    @Override
    public boolean updateCharacter(GameCharacter character) {
        if (character == null || character.getId() == null) {
            return false;
        }
        return characterMapper.update(character) > 0;
    }

    @Override
    public boolean deleteCharacter(Long id) {
        if (id == null) {
            return false;
        }
        GameCharacter existing = characterMapper.findById(id);
        if (existing != null) {
            if (existing.getAvatarUrl() != null) {
                ossUtil.deleteByUrlIfOwned(existing.getAvatarUrl());
            }
            if (existing.getMoveListImageUrl() != null) {
                ossUtil.deleteByUrlIfOwned(existing.getMoveListImageUrl());
            }
        }
        return characterMapper.deleteById(id) > 0;
    }

    @Override
    public List<Move> getMovesByCharacterId(Long characterId) {
        if (characterId == null) {
            return null;
        }
        return moveMapper.findByCharacterId(characterId);
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
}

