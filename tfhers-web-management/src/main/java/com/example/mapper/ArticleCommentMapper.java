package com.example.mapper;

import com.example.pojo.ArticleComment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ArticleCommentMapper {

    List<ArticleComment> selectByArticleIdRoot(@Param("articleId") long articleId);

    List<ArticleComment> selectByParentId(@Param("parentId") long parentId);

    /** 某资讯下全部已通过评论（含多级），用于组装楼中楼 */
    List<ArticleComment> selectApprovedByArticleId(@Param("articleId") long articleId);

    int insert(ArticleComment comment);

    List<ArticleComment> selectAdminList(@Param("offset") int offset,
                                         @Param("limit") int limit,
                                         @Param("status") Integer status,
                                         @Param("articleId") Long articleId);

    int countAdminList(@Param("status") Integer status,
                       @Param("articleId") Long articleId);

    int updateStatus(@Param("id") Long id,
                     @Param("status") Integer status,
                     @Param("adminRemark") String adminRemark);

    int deleteByArticleId(@Param("articleId") long articleId);
}
