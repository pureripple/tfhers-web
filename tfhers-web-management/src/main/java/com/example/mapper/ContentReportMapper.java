package com.example.mapper;

import com.example.pojo.ContentReport;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ContentReportMapper {
    int insert(ContentReport report);

    /**
     * 可选：如果你建表时加了 uk_open_report 唯一索引，可用于友好提示
     */
    int countOpenReport(@Param("userId") Long userId,
                        @Param("targetType") String targetType,
                        @Param("targetId") Long targetId);

    /** 管理端：分页查询举报列表，按创建时间倒序 */
    List<ContentReport> selectList(@Param("offset") int offset,
                                   @Param("limit") int limit,
                                   @Param("status") Integer status,
                                   @Param("targetType") String targetType);

    /** 管理端：符合条件的总数 */
    int countByFilter(@Param("status") Integer status,
                      @Param("targetType") String targetType);

    /** 管理端：更新状态与管理员备注 */
    int updateStatus(@Param("id") Long id,
                    @Param("status") Integer status,
                    @Param("adminRemark") String adminRemark);

    /** 删除资讯等：按举报对象类型与 ID 清理记录 */
    int deleteByTarget(@Param("targetType") String targetType, @Param("targetId") long targetId);
}

