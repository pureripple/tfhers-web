package com.example.service;

import com.example.pojo.Move;

import java.util.List;

public interface MoveService {

    List<Move> getMovesByCharacterId(Long characterId);

    Move getMoveById(Long id);

    boolean createMove(Move move);

    boolean updateMove(Move move);

    boolean deleteMove(Long id);
}

