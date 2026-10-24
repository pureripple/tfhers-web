package com.example.mapper;

import com.example.pojo.TournamentMatch;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TournamentMatchMapper {
    int insert(TournamentMatch match);
    int update(TournamentMatch match);
    int updateNextMatchId(@Param("id") Long id, @Param("nextMatchId") Long nextMatchId, @Param("nextSlot") Integer nextSlot);
    TournamentMatch findById(@Param("id") Long id);
    List<TournamentMatch> listByTournament(@Param("tournamentId") Long tournamentId);
    int deleteByTournament(@Param("tournamentId") Long tournamentId);
    int setPlayerSlot(@Param("id") Long id, @Param("slot") int slot, @Param("userId") Long userId, @Param("status") String status);
}