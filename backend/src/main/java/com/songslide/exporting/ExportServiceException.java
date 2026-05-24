package com.songslide.exporting;

public class ExportServiceException extends RuntimeException {

    public ExportServiceException(String message) {
        super(message);
    }

    public ExportServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
