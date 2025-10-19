package com.example.controller;

import com.example.pojo.results;
import com.example.util.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * 文件上传控制器
 */
@RestController
@RequestMapping("/api/file")
@CrossOrigin(origins = "*")
public class FileUploadController {
    
    @Autowired
    private OssUtil ossUtil;
    
    /**
     * 上传头像
     * @param file 头像文件
     * @return 上传结果
     */
    @PostMapping("/upload/avatar")
    public results uploadAvatar(@RequestParam("file") MultipartFile file) {
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                return results.error("请选择要上传的文件");
            }
            
            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return results.error("只能上传图片文件");
            }
            
            // 验证文件大小（限制为5MB）
            long maxSize = 5 * 1024 * 1024; // 5MB
            if (file.getSize() > maxSize) {
                return results.error("文件大小不能超过5MB");
            }
            
            // 上传文件
            String fileUrl = ossUtil.uploadAvatar(file);
            
            // 准备返回数据
            Map<String, Object> data = new HashMap<>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", contentType);
            
            return results.success("头像上传成功", data);
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("头像上传失败：" + e.getMessage());
        }
    }
    
    /**
     * 上传通用文件
     * @param file 文件
     * @param folder 文件夹路径（可选）
     * @return 上传结果
     */
    @PostMapping("/upload")
    public results uploadFile(@RequestParam("file") MultipartFile file,
                                                  @RequestParam(value = "folder", required = false) String folder) {
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                return results.error("请选择要上传的文件");
            }
            
            // 验证文件大小（限制为10MB）
            long maxSize = 10 * 1024 * 1024; // 10MB
            if (file.getSize() > maxSize) {
                return results.error("文件大小不能超过10MB");
            }
            
            // 上传文件
            String fileUrl = ossUtil.uploadFile(file, folder);
            
            // 准备返回数据
            Map<String, Object> data = new HashMap<>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", file.getContentType());
            data.put("folder", folder);
            
            return results.success("文件上传成功", data);
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("文件上传失败：" + e.getMessage());
        }
    }
    
    /**
     * 上传文章封面图片
     * @param file 封面图片文件
     * @return 上传结果
     */
    @PostMapping("/upload/article-cover")
    public results uploadArticleCover(@RequestParam("file") MultipartFile file) {
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                return results.error("请选择要上传的图片");
            }
            
            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return results.error("只能上传图片文件");
            }
            
            // 验证文件大小（限制为5MB）
            long maxSize = 5 * 1024 * 1024; // 5MB
            if (file.getSize() > maxSize) {
                return results.error("图片大小不能超过5MB");
            }
            
            // 上传文件到articles文件夹
            String fileUrl = ossUtil.uploadFile(file, "articles");
            
            // 准备返回数据
            Map<String, Object> data = new HashMap<>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            data.put("size", file.getSize());
            data.put("contentType", contentType);
            
            return results.success("封面图片上传成功", data);
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("封面图片上传失败：" + e.getMessage());
        }
    }
    
    /**
     * 删除文件
     * @param url 文件URL
     * @return 删除结果
     */
    @DeleteMapping("/delete")
    public results deleteFile(@RequestParam("url") String url) {
        try {
            if (url == null || url.isEmpty()) {
                return results.error("文件URL不能为空");
            }
            
            // 提取对象键
            String objectKey = ossUtil.extractObjectKeyFromUrl(url);
            if (objectKey == null) {
                return results.error("无效的文件URL");
            }
            
            // 删除文件
            boolean success = ossUtil.deleteFile(objectKey);
            if (success) {
                return results.success("文件删除成功", null);
            } else {
                return results.error("文件删除失败");
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return results.error("文件删除失败：" + e.getMessage());
        }
    }
}
