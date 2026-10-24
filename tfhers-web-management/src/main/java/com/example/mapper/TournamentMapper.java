package com.example.mapper;

import com.example.pojo.Tournament;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TournamentMapper {
    int insert(Tournament tournament);
    int update(Tournament tournament);
    Tournament findById(@Param("id") Long id);
    List<Tournament> listPublic();
    List<Tournament> listAll();
    int countRegistrations(@Param("tournamentId") Long tournamentId);
}