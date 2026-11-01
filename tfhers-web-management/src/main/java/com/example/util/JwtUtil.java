package com.example.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT工具类。
 * <p>
 * Token claim {@code type} 取值为 {@code user} 或 {@code admin}。
 * 旧 Token 可能写死 type=admin 或缺 type：建议强制重登；
 * 解析时缺 type / 非法 type 一律按 user 处理，绝不默认成 admin。
 */
@Component
public class JwtUtil {

    public static final String TYPE_USER = "user";
    public static final String TYPE_ADMIN = "admin";
    
    // JWT密钥（从配置文件读取）
    @Value("${jwt.secret}")
    private String secret;
    
    // JWT过期时间（从配置文件读取）
    @Value("${jwt.expiration:604800000}")
    private long expirationTime;

    public String getSecret() {
        return secret;
    }

    public long getExpirationTime() {
        return expirationTime;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }
    
    /**
     * 生成用户侧 JWT（type=user）。勿再写死 admin。
     */
    public String generateToken(Long userId, String username) {
        return generateToken(userId, username, TYPE_USER);
    }

    /**
     * 生成指定类型 JWT。
     * @param type {@link #TYPE_USER} 或 {@link #TYPE_ADMIN}
     */
    public String generateToken(Long userId, String username, String type) {
        String normalized = normalizeType(type);
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("type", normalized);
        return createToken(claims, username);
    }

    /** 管理端登录签发 */
    public String generateAdminToken(Long userId, String username) {
        return generateToken(userId, username, TYPE_ADMIN);
    }

    /** 用户端登录签发 */
    public String generateUserToken(Long userId, String username) {
        return generateToken(userId, username, TYPE_USER);
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTime);
        
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
    
    public String getUsernameFromToken(String token) {
        try {
            Claims claims = getAllClaimsFromToken(token);
            String sub = claims.getSubject();
            if (sub != null && !sub.isBlank()) {
                return sub.trim();
            }
            Object un = claims.get("username");
            return un != null ? un.toString().trim() : null;
        } catch (Exception e) {
            return null;
        }
    }
    
    public Long getUserIdFromToken(String token) {
        Claims claims = getAllClaimsFromToken(token);
        return parseUserIdClaim(claims.get("userId"));
    }

    /**
     * 读取 token 类型。缺 type / 非 admin 时保守返回 user（不为 admin）。
     * 旧 Token 建议强制重登后再走管理端鉴权（卡③）。
     */
    public String getTokenType(String token) {
        try {
            Claims claims = getAllClaimsFromToken(token);
            return normalizeType(claims.get("type") == null ? null : claims.get("type").toString());
        } catch (Exception e) {
            return TYPE_USER;
        }
    }

    private static String normalizeType(String type) {
        if (type == null) {
            return TYPE_USER;
        }
        String t = type.trim().toLowerCase();
        if (TYPE_ADMIN.equals(t)) {
            return TYPE_ADMIN;
        }
        return TYPE_USER;
    }

    /**
     * JWT 里数字 claim 可能被解析成 Integer/Long/Double/String，直接 get(..., Long.class) 常为 null。
     */
    public static Long parseUserIdClaim(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Long) {
            return (Long) raw;
        }
        if (raw instanceof Integer) {
            return ((Integer) raw).longValue();
        }
        if (raw instanceof Number) {
            return ((Number) raw).longValue();
        }
        if (raw instanceof String) {
            String s = ((String) raw).trim();
            if (s.isEmpty()) {
                return null;
            }
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
    
    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }
    
    public <T> T getClaimFromToken(String token, java.util.function.Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
    
    public Boolean isTokenExpired(String token) {
        final Date expiration = getExpirationDateFromToken(token);
        if (expiration == null) {
            return true;
        }
        return expiration.before(new Date());
    }
    
    public Boolean validateToken(String token, String username) {
        final String tokenUsername = getUsernameFromToken(token);
        return (tokenUsername.equals(username) && !isTokenExpired(token));
    }
    
    public Boolean validateToken(String token) {
        try {
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }
}
