package com.songslide.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "songslide.storage.local")
public record LocalStorageProperties(
        @NotBlank String root
) {
}
