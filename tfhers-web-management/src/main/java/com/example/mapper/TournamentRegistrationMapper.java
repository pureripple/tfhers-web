package com.example.mapper;

import com.example.pojo.TournamentRegistration;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TournamentRegistrationMapper {
    int insert(TournamentRegistration registration);
    TournamentRegistration findByTournamentAndUser(@Param("tournamentId") Long tournamentId, @Param("userId") Long userId);
    List<TournamentRegistration> listActiveByTournament(@Param("tournamentId") Long tournamentId);
    List<TournamentRegistration> listHistoryByUser(@Param("userId") Long userId);
    int countActiveByTournament(@Param("tournamentId") Long tournamentId);
    int countCheckedInByTournament(@Param("tournamentId") Long tournamentId);
    int updateStatus(@Param("id") Long id, @Param("status") String status);
    int updateSeed(@Param("id") Long id, @Param("seed") Integer seed);
    int markCheckedIn(@Param("id") Long id);
    int updateResultStats(@Param("id") Long id,
                          @Param("finalPlacement") Integer finalPlacement,
                          @Param("wins") int wins,
                          @Param("losses") int losses);
    int clearResultStatsByTournament(@Param("tournamentId") Long tournamentId);
    int withdraw(@Param("tournamentId") Long tournamentId, @Param("userId") Long userId);
    int deleteByTournament(@Param("tournamentId") Long tournamentId);
}
