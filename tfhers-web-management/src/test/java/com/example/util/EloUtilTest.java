package com.example.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Elo / 炸分 / 段位差距 / 比分细调 单元计算，不启 Spring。
 * C=1100 vs S=1700：预期结果加减很小，爆冷放大摆幅。
 */
class EloUtilTest {

    @Test
    void expectedScore_cVsS() {
        double cExpect = EloUtil.expectedScore(1100, 1700);
        double sExpect = EloUtil.expectedScore(1700, 1100);
        assertTrue(cExpect < 0.05, "C vs S 期望应很低: " + cExpect);
        assertTrue(sExpect > 0.95, "S vs C 期望应很高: " + sExpect);
        assertEquals(1.0, cExpect + sExpect, 1e-9);
    }

    @Test
    void kFactors_cAndS() {
        assertEquals(40, EloUtil.kFactor(1100)); // C
        assertEquals(24, EloUtil.kFactor(1700)); // S
    }

    @Test
    void sBeatsC_almostNoChange() {
        // S 击败 C：经典 Elo 下双方变动约 ±1，且受防炸分限制
        int sDelta = EloUtil.computeDelta(1700, 1100, true);
        int cDelta = EloUtil.computeDelta(1100, 1700, false);
        assertTrue(sDelta >= 0 && sDelta <= EloUtil.FARM_MAX_GAIN, "S 虐菜加分应封顶: " + sDelta);
        assertTrue(cDelta >= -3 && cDelta <= 0, "C 输给 S 应少扣: " + cDelta);
    }

    @Test
    void cUpsetsS_bigSwing() {
        int cDelta = EloUtil.computeDelta(1100, 1700, true);
        int sDelta = EloUtil.computeDelta(1700, 1100, false);
        assertTrue(cDelta >= 35, "C 爆冷应大涨: " + cDelta);
        assertTrue(sDelta <= -20, "S 爆冷应大跌: " + sDelta);
    }

    @Test
    void farmCap_limitsFavoriteGain() {
        // 1500(A) vs 1100(C)：期望约 0.91，原始加分可能 >2，应被上限压住
        double expect = EloUtil.expectedScore(1500, 1100);
        assertTrue(expect >= EloUtil.FARM_EXPECTED_THRESHOLD);
        int gain = EloUtil.computeDelta(1500, 1100, true);
        assertTrue(gain <= EloUtil.FARM_MAX_GAIN, "炸分加分超限: " + gain);
    }

    @Test
    void allowsNegativeRating() {
        // 与远强于己的对手连败时，单场扣分会很小；取消托底后应可跌破 0
        int after = EloUtil.computeNewRating(0, 2000, false);
        assertTrue(after <= 0, "应允许 <=0: " + after);
        int deep = EloUtil.computeNewRating(-50, 2000, false);
        assertTrue(deep <= -50, "负数应能继续小幅下降或持平: " + deep);
    }

    @Test
    void actualScore_blowoutAndClose() {
        assertEquals(1.0, EloUtil.actualScore(true, 2, 0), 1e-9);
        assertEquals(0.0, EloUtil.actualScore(false, 0, 2), 1e-9);
        assertEquals(2.0 / 3.0, EloUtil.actualScore(true, 2, 1), 1e-9);
        assertEquals(1.0 / 3.0, EloUtil.actualScore(false, 1, 2), 1e-9);
        // 无比分回退纯胜负
        assertEquals(1.0, EloUtil.actualScore(true, null, null), 1e-9);
        assertEquals(0.0, EloUtil.actualScore(false, null, null), 1e-9);
    }

    @Test
    void closeLoss_underdogGetsConsolation() {
        // C 输给 S 但吃下一局（1-2）：虽败犹荣，应变为加分或明显少扣
        int shutout = EloUtil.computeDelta(1100, 1700, false, 0, 2);
        int close = EloUtil.computeDelta(1100, 1700, false, 1, 2);
        assertTrue(close > shutout, "2-1 负应比 0-2 负更优: close=" + close + " shutout=" + shutout);
        assertTrue(close >= 0, "吃掉高水平一局应虽败犹荣不加大幅扣分: " + close);
    }

    @Test
    void closeWin_favoriteDoesNotLosePoints() {
        // S 2-1 险胜 C：占比可能 < expected，但整场获胜不掉分
        int delta = EloUtil.computeDelta(1700, 1100, true, 2, 1);
        assertTrue(delta >= 0, "整场获胜不应掉分: " + delta);
    }

    @Test
    void equalPeers_closeVsBlowout() {
        // 同分段 1400：2-0 摆幅大于 2-1
        int win20 = EloUtil.computeDelta(1400, 1400, true, 2, 0);
        int win21 = EloUtil.computeDelta(1400, 1400, true, 2, 1);
        int lose02 = EloUtil.computeDelta(1400, 1400, false, 0, 2);
        int lose12 = EloUtil.computeDelta(1400, 1400, false, 1, 2);
        assertTrue(win20 > win21, "2-0 胜应比 2-1 胜加更多: " + win20 + " vs " + win21);
        assertTrue(lose12 > lose02, "1-2 负应比 0-2 负扣更少: " + lose12 + " vs " + lose02);
    }
}
