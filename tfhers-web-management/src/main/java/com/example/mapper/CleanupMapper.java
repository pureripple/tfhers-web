package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 数据清理用只读/删除查询（房间 / OSS 引用 / 旧举报）
 */
@Mapper
public interface CleanupMapper {

    List<String> listUserAvatarUrls();

    List<String> listAdminAvatarUrls();

    List<String> listArticleCoverUrls();

    List<String> listArticleContents();

    List<String> listComboVideoUrls();

    List<String> listComboFileUrls();

    List<String> listCharacterAvatarUrls();

    List<String> listCharacterMoveListUrls();

    List<String> listReportEvidenceUrls();

    int deleteResolvedReportsBefore(@Param("cutoff") LocalDateTime cutoff);

    int countResolvedReportsBefore(@Param("cutoff") LocalDateTime cutoff);
}
