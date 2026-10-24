package com.example.service;

import com.example.pojo.GameCharacter;
import com.example.pojo.Move;
import com.example.pojo.Combo;

import java.util.List;

public interface CharacterService {

    List<GameCharacter> getAllCharacters();

    GameCharacter getCharacterById(Long id);

    boolean createCharacter(GameCharacter character);

    boolean updateCharacter(GameCharacter character);

    boolean deleteCharacter(Long id);

    List<Move> getMovesByCharacterId(Long characterId);

    List<Combo> getCombosByCharacterId(Long characterId, String status);
}

