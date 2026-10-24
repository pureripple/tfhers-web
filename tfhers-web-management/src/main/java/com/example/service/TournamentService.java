package com.example.service;

import com.example.pojo.Tournament;
import com.example.pojo.TournamentMatch;
import com.example.pojo.TournamentRegistration;
import com.example.pojo.results;

import java.util.List;
import java.util.Map;

public interface TournamentService {
    List<Tournament> listPublic(Long viewerUserId);
    List<Tournament> listAll();
    Map<String, Object> getDetail(Long id, Long viewerUserId);
    Map<String, Object> getBracket(Long id);
    results register(Long tournamentId, Long userId);
    results withdraw(Long tournamentId, Long userId);
    results create(Tournament tournament, Long adminId);
    results update(Tournament tournament, Long adminId);
    results setStatus(Long id, String status, Long adminId);
    List<TournamentRegistration> listRegistrations(Long tournamentId);
    results generateBracket(Long tournamentId, boolean shuffle, Long adminId);
    results enterResult(Long matchId, Integer score1, Integer score2, Long adminId);
    results delete(Long id, Long adminId);
}