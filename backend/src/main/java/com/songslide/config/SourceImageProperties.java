package com.songslide.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "songslide.source-images")
public record SourceImageProperties(
        @DefaultValue("10")
        @Min(1)
        long maxSizeMb
) {

    public long maxSizeBytes() {
        return maxSizeMb * 1024L * 1024L;
    }
}
