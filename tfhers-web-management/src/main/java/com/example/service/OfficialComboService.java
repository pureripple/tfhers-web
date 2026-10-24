package com.example.service;

import com.example.pojo.OfficialCombo;

import java.util.List;

public interface OfficialComboService {

    OfficialCombo getById(Long id);

    List<OfficialCombo> getByCharacterId(Long characterId);

    boolean create(OfficialCombo combo);

    boolean update(OfficialCombo combo);

    boolean delete(Long id);
}

