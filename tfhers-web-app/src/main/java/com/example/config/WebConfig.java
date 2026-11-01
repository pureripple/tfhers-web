package com.example.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

/**
 * Central CORS for the app proxy module.
 * Shares CORS_ALLOWED_ORIGINS / tfhers.cors.allowed-origins with management.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${tfhers.cors.allowed-origins}")
    private String corsAllowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(corsAllowedOrigins == null ? new String[0] : corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
        if (origins.length == 0) {
            return;
        }
        var mapping = registry.addMapping("/api/**")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .maxAge(3600);
        boolean wildcard = Arrays.asList(origins).contains("*");
        if (wildcard) {
            mapping.allowedOriginPatterns("*")
                    .allowCredentials(false);
        } else {
            mapping.allowedOrigins(origins)
                    .allowCredentials(false);
        }
    }
}