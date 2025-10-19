package com.example.mapper;

import com.example.pojo.articles;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface articlesMapper {
    /**
     * 获取所有资讯
     * @return 资讯列表
     */
    List<articles> selectAllArticles();
    /**
     * 根据id删除资讯
     * @param id 资讯id
     * @return 删除影响的行数
     */
    int deleteArticleById(@Param("id") long id);
    
    /**
     * 新增文章
     * @param article 文章对象
     * @return 插入影响的行数
     */
    int insertArticle(articles article);
    
    /**
     * 根据ID查询单篇文章
     * @param id 文章ID
     * @return 文章对象
     */
    articles selectArticleById(@Param("id") long id);
    
    /**
     * 更新文章
     * @param article 文章对象
     * @return 更新影响的行数
     */
    int updateArticle(articles article);
    
    /**
     * 搜索文章
     * @param keyword 搜索关键词
     * @return 文章列表
     */
    List<articles> searchArticles(@Param("keyword") String keyword);
}
