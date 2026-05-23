package com.songslide.common.api;

public record ApiResponse<T>(
        T data,
        ApiStatus status,
        int code,
        String errorMessage
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(data, ApiStatus.SUCCESS, 200, null);
    }

    public static <T> ApiResponse<T> failed(int code, String errorMessage) {
        return new ApiResponse<>(null, ApiStatus.FAILED, code, errorMessage);
    }
}
