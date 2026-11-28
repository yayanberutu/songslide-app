package com.songslide.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "songslide.ocr-service")
public record OcrServiceProperties(
        @DefaultValue("http://localhost:8001")
        String url
) {
}
