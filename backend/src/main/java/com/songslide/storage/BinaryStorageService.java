package com.songslide.storage;

public interface BinaryStorageService {

    void save(String storageKey, byte[] content);

    byte[] read(String storageKey);

    void delete(String storageKey);

    boolean exists(String storageKey);
}
