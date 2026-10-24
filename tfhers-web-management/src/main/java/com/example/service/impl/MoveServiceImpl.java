package com.example.service.impl;

import com.example.mapper.MoveMapper;
import com.example.pojo.Move;
import com.example.service.MoveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MoveServiceImpl implements MoveService {

    @Autowired
    private MoveMapper moveMapper;

    @Override
    public List<Move> getMovesByCharacterId(Long characterId) {
        if (characterId == null) {
            return null;
        }
        return moveMapper.findByCharacterId(characterId);
    }

    @Override
    public Move getMoveById(Long id) {
        if (id == null) {
            return null;
        }
        return moveMapper.findById(id);
    }

    @Override
    public boolean createMove(Move move) {
        if (move == null || move.getCharacterId() == null) {
            return false;
        }
        return moveMapper.insert(move) > 0;
    }

    @Override
    public boolean updateMove(Move move) {
        if (move == null || move.getId() == null) {
            return false;
        }
        return moveMapper.update(move) > 0;
    }

    @Override
    public boolean deleteMove(Long id) {
        if (id == null) {
            return false;
        }
        return moveMapper.deleteById(id) > 0;
    }
}

