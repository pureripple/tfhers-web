package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ArticleLikeMapper {

    int countByArticleId(@Param("articleId") long articleId);

    int exists(@Param("articleId") long articleId, @Param("userId") long userId);

    int insert(@Param("articleId") long articleId, @Param("userId") long userId);

    int delete(@Param("articleId") long articleId, @Param("userId") long userId);

    /** 删除资讯时清空该文所有点赞 */
    int deleteByArticleId(@Param("articleId") long articleId);
}
