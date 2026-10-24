package com.example.mapper;

import com.example.pojo.Room;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface RoomMapper {
    int insert(Room room);

    int updateStatusAndCount(@Param("id") Long id,
                             @Param("status") String status,
                             @Param("memberCount") Integer memberCount);

    int closeRoom(@Param("id") Long id);

    int transferHost(@Param("id") Long id, @Param("hostUserId") Long hostUserId);

    Room findById(@Param("id") Long id);

    List<Room> listOpenOrFull();

    /** 用户作为房主的开放中房间数（OPEN/FULL） */
    int countOpenByHost(@Param("hostUserId") Long hostUserId);

    Room findOpenByHost(@Param("hostUserId") Long hostUserId);

    /** CLOSED 且 closed_at 早于 cutoff 的房间（用于延迟硬删） */
    List<Room> listClosedBefore(@Param("cutoff") LocalDateTime cutoff, @Param("limit") int limit);

    int deleteById(@Param("id") Long id);

    int countByStatus(@Param("status") String status);
}
