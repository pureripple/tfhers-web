package com.example.util;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.PutObjectRequest;
import com.example.config.OssConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 阿里云OSS工具类
 */
@Component
public class OssUtil {
    
    @Autowired
    private OSS ossClient;
    
    @Autowired
    private OssConfig ossConfig;
    
    /**
     * 上传文件到OSS
     * @param file 文件
     * @param folder 文件夹路径（可选）
     * @return 文件访问URL
     * @throws IOException IO异常
     */
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        
        // 生成文件名
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String fileName = generateFileName(extension);
        
        // 构建对象键
        String objectKey = folder != null && !folder.isEmpty() 
            ? folder + "/" + fileName 
            : fileName;
        
        try (InputStream inputStream = file.getInputStream()) {
            // 创建上传请求
            PutObjectRequest putObjectRequest = new PutObjectRequest(
                ossConfig.getBucketName(), 
                objectKey, 
                inputStream
            );
            
            // 上传文件
            ossClient.putObject(putObjectRequest);
            
            // 返回文件访问URL
            return ossConfig.getDomain() + "/" + objectKey;
            
        } catch (Exception e) {
            throw new IOException("文件上传失败：" + e.getMessage(), e);
        }
    }
    
    /**
     * 上传文件到OSS（默认上传到根目录）
     * @param file 文件
     * @return 文件访问URL
     * @throws IOException IO异常
     */
    public String uploadFile(MultipartFile file) throws IOException {
        return uploadFile(file, null);
    }
    
    /**
     * 上传头像文件
     * @param file 头像文件
     * @return 头像访问URL
     * @throws IOException IO异常
     */
    public String uploadAvatar(MultipartFile file) throws IOException {
        return uploadFile(file, "avatars");
    }
    
    /**
     * 删除OSS文件
     * @param objectKey 对象键
     * @return 是否删除成功
     */
    public boolean deleteFile(String objectKey) {
        try {
            ossClient.deleteObject(ossConfig.getBucketName(), objectKey);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * 从URL中提取对象键
     * @param url 文件URL
     * @return 对象键
     */
    public String extractObjectKeyFromUrl(String url) {
        if (url == null || !url.startsWith(ossConfig.getDomain())) {
            return null;
        }
        return url.substring(ossConfig.getDomain().length() + 1);
    }
    
    /**
     * 生成唯一文件名
     * @param extension 文件扩展名
     * @return 文件名
     */
    private String generateFileName(String extension) {
        // 使用时间戳 + UUID + 扩展名
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return timestamp + "_" + uuid + extension;
    }
}
