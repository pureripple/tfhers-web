package com.example.util;

/**
 * Steam 绑定成功后，浏览器应跳回的前端地址。
 * 站点根来自 {@code tfhers.frontend.base-url} / {@code FRONTEND_BASE_URL}。
 */
public final class SteamBindRedirect {

    /** 与 application.yml 缺省一致：本地 Vite。 */
    public static final String LOCAL_DEFAULT_BASE = "http://localhost:5173";

    private static final String SETTINGS_PATH = "/settings";

    private SteamBindRedirect() {
    }

    /**
     * @param frontendBaseUrl 站点根，例如 {@code http://tfhers.cn} 或 {@code http://localhost:5173}。
     *                        空值回落到本地默认。末尾多余的 {@code /} 会去掉。
     * @return {@code {base}/settings}
     */
    public static String successLocation(String frontendBaseUrl) {
        String base = frontendBaseUrl == null ? "" : frontendBaseUrl.trim();
        base = base.replace("\r", "").replace("\n", "");
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (base.isEmpty()) {
            base = LOCAL_DEFAULT_BASE;
        }
        return base + SETTINGS_PATH;
    }
}