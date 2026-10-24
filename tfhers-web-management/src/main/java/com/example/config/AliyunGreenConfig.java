package com.example.config;

import com.aliyun.green20220302.Client;
import com.aliyun.teaopenapi.models.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AliyunGreenConfig {

    @Value("${aliyun.green.access-key-id:}")
    private String accessKeyId;

    @Value("${aliyun.green.access-key-secret:}")
    private String accessKeySecret;

    @Value("${aliyun.green.endpoint:}")
    private String endpoint;

    @Value("${aliyun.green.region-id:cn-beijing}")
    private String regionId;

    @Bean
    public Client greenClient() throws Exception {
        Config config = new Config()
                .setAccessKeyId(accessKeyId)
                .setAccessKeySecret(accessKeySecret);
        // endpoint 形如：green.cn-beijing.aliyuncs.com
        if (endpoint != null && !endpoint.isBlank()) {
            config.setEndpoint(endpoint);
        }
        if (regionId != null && !regionId.isBlank()) {
            config.setRegionId(regionId);
        }
        return new Client(config);
    }
}

