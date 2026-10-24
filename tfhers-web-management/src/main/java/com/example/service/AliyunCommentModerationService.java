package com.example.service;

import java.util.List;

public interface AliyunCommentModerationService {

    class ModerationDecision {
        public final boolean pass;
        public final String riskLevel; // high/medium/low/unknown
        public final List<String> labels;
        public final String riskTips;
        public final String riskWords;
        public final String rawReasonJson;

        public ModerationDecision(boolean pass,
                                  String riskLevel,
                                  List<String> labels,
                                  String riskTips,
                                  String riskWords,
                                  String rawReasonJson) {
            this.pass = pass;
            this.riskLevel = riskLevel;
            this.labels = labels;
            this.riskTips = riskTips;
            this.riskWords = riskWords;
            this.rawReasonJson = rawReasonJson;
        }
    }

    ModerationDecision moderateComment(String content, Long userId, Long articleId);
}

