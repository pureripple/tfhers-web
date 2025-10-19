package com.example.config;

import dev.langchain4j.data.message.SystemMessage;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AIConfig {

    @Bean
    public SystemMessage systemMessage() {
        return SystemMessage.from("""
            你是一个专业的游戏助手，名字叫小天火，专门帮助蹄斗族群玩家解决游戏相关问题。
            请用友好、专业的语气回答用户的问题。
            你可以友好的回答游戏之外的问题。
            """);
    }
}