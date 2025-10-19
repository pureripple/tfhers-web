package com.example.controller;

import com.example.pojo.articles;
import com.example.pojo.results;
import com.example.service.articlesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "*")
public class articlesController {

    //创建一个service接口，用来调用service
    @Autowired
    private articlesService articlesService;

    /**
     * 获取所有文章列表
     * @return 文章列表
     */
    @GetMapping(value = "/all", produces = "application/json")
    public ResponseEntity<Map<String, Object>> getAllArticles() {
        results result = articlesService.getAllArticles();
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        return ResponseEntity.ok(response);
    }
    
    /**
     * 根据id删除文章
     * @param id 文章id
     * @return 删除结果
     */
    @DeleteMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<Map<String, Object>> deleteArticleById(@PathVariable long id) {
        results result = articlesService.deleteArticleById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 新增文章
     * @param article 文章对象
     * @return 新增结果
     */
    @PostMapping(value = "", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> addArticle(@RequestBody articles article) {
        results result = articlesService.addArticle(article);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 根据ID查询单篇文章
     * @param id 文章ID
     * @return 查询结果
     */
    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<Map<String, Object>> getArticleById(@PathVariable long id) {
        results result = articlesService.getArticleById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 更新文章
     * @param article 文章对象
     * @return 更新结果
     */
    @PutMapping(value = "", produces = "application/json", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> updateArticle(@RequestBody articles article) {
        results result = articlesService.updateArticle(article);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 搜索文章
     * @param keyword 搜索关键词
     * @return 搜索结果
     */
    @GetMapping(value = "/search", produces = "application/json")
    public ResponseEntity<Map<String, Object>> searchArticles(@RequestParam String keyword) {
        results result = articlesService.searchArticles(keyword);
        Map<String, Object> response = new HashMap<>();
        response.put("code", result.getCode());
        response.put("msg", result.getMsg());
        response.put("data", result.getData());
        
        // 根据操作结果返回不同的HTTP状态码
        if (result.getCode() == 200) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
}
