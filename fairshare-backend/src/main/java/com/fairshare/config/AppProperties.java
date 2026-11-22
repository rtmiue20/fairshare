package com.fairshare.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Gemini gemini = new Gemini();

    @Data
    public static class Jwt {
        private String secret = "fairshare-dev-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256"; // ggignore
        private long expirationMs = 86400000L;
    }

    @Data
    public static class Gemini {
        private String apiKey = "";
        private String model = "gemini-3.8-flash";
    }
}
