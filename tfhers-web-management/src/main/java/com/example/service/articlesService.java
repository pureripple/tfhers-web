package com.example.service;

import com.example.pojo.articles;
import com.example.pojo.results;
import org.springframework.stereotype.Service;


@Service
public interface articlesService {
    /**
     * 获取所有文章列表
     * @return 文章列表
     */
    results getAllArticles();
    
    /**
     * 根据id删除文章
     * @param id 文章id
     * @return 删除结果
     */
    results deleteArticleById(long id);
    
    /**
     * 新增文章
     * @param article 文章对象
     * @return 新增结果
     */
    results addArticle(articles article);
    
    /**
     * 根据ID查询单篇文章
     * @param id 文章ID
     * @return 查询结果
     */
    results getArticleById(long id);
    
    /**
     * 更新文章
     * @param article 文章对象
     * @return 更新结果
     */
    results updateArticle(articles article);
    
    /**
     * 搜索文章
     * @param keyword 搜索关键词
     * @return 搜索结果
     */
    results searchArticles(String keyword);
}
