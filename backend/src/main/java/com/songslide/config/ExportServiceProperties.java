package com.songslide.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "songslide.export-service")
public record ExportServiceProperties(
        @NotBlank String url
) {
}
