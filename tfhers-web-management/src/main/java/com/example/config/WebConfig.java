package com.example.config;

import java.util.Arrays;

import com.example.interceptor.AdminInterceptor;
import com.example.interceptor.LoginInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Autowired
    private LoginInterceptor loginInterceptor;

    @Autowired
    private AdminInterceptor adminInterceptor;

    /** Comma-separated Origins from tfhers.cors.allowed-origins / CORS_ALLOWED_ORIGINS */
    @Value("${tfhers.cors.allowed-origins}")
    private String corsAllowedOrigins;
    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loginInterceptor)
                .addPathPatterns("/api/**")  // 鎷︽埅鎵€鏈堿PI璇锋眰
                .excludePathPatterns(
                    "/api/admin/login",      // 鎺掗櫎绠＄悊鍛樼櫥褰曟帴鍙?
                    "/api/user/register",    // 鎺掗櫎鐢ㄦ埛娉ㄥ唽鎺ュ彛
                    "/api/user/login",       // 鎺掗櫎鐢ㄦ埛鐧诲綍鎺ュ彛
                    "/static/**",            // 鎺掗櫎闈欐€佽祫婧?
                    "/css/**",               // 鎺掗櫎CSS
                    "/js/**",                // 鎺掗櫎JS
                    "/images/**"             // 鎺掗櫎鍥剧墖
                );
        // 绠＄悊绔厹搴曪細鐧诲綍涔嬪悗鍐嶅己鍒?admin_users锛圲SER Token 鈫?403锛?
        registry.addInterceptor(adminInterceptor)
                .addPathPatterns(
                    "/api/admin/**",
                    "/api/user-management/**",
                    "/api/profile/**"  // 绠＄悊绔釜浜鸿祫鏂欙紝鍚岀被绠＄悊鍐欐帴鍙?
                )
                .excludePathPatterns(
                    "/api/admin/login"
                );
    }
    
    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer
            .defaultContentType(MediaType.APPLICATION_JSON)
            .mediaType("json", MediaType.APPLICATION_JSON)
            .mediaType("xml", MediaType.APPLICATION_XML);
    }
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(corsAllowedOrigins == null ? new String[0] : corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
        if (origins.length == 0) {
            // Fail closed: no Origin allowed until configured
            return;
        }
        var mapping = registry.addMapping("/api/**")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .maxAge(3600);
        boolean wildcard = Arrays.asList(origins).contains("*");
        if (wildcard) {
            // Dev only: * cannot pair with allowCredentials(true)
            mapping.allowedOriginPatterns("*")
                    .allowCredentials(false);
        } else {
            mapping.allowedOrigins(origins)
                    .allowCredentials(false);
        }
    }
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/");
    }
}
