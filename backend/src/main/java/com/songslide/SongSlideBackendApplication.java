package com.songslide;

import com.songslide.config.LocalStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(LocalStorageProperties.class)
public class SongSlideBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SongSlideBackendApplication.class, args);
    }
}
