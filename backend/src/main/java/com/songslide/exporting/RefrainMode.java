package com.songslide.exporting;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.Locale;

public enum RefrainMode {
    NONE,
    ONCE_AFTER_ALL_VERSES,
    AFTER_EACH_VERSE;

    @JsonCreator
    public static RefrainMode from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("refrainMode is required");
        }
        return RefrainMode.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
