package com.example.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SteamBindRedirectTest {

    @Test
    void blankBaseFallsBackToLocalViteSettings() {
        assertEquals("http://localhost:5173/settings", SteamBindRedirect.successLocation(null));
        assertEquals("http://localhost:5173/settings", SteamBindRedirect.successLocation("  "));
    }

    @Test
    void stripsTrailingSlash() {
        assertEquals("http://localhost:5173/settings", SteamBindRedirect.successLocation("http://localhost:5173/"));
        assertEquals("http://tfhers.cn/settings", SteamBindRedirect.successLocation("http://tfhers.cn/"));
    }

    @Test
    void productionBaseDoesNotUseLocalhost() {
        String location = SteamBindRedirect.successLocation("http://tfhers.cn");
        assertEquals("http://tfhers.cn/settings", location);
    }
}
