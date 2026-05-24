package com.songslide.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.songslide.config.LocalStorageProperties;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalFileSystemStorageServiceTests {

    @TempDir
    private Path storageRoot;

    @Test
    void saveAndReadFileUnderConfiguredRoot() {
        LocalFileSystemStorageService storage = storageService();
        String storageKey = "source-images/be-001/source.png";
        byte[] content = "fake-image-bytes".getBytes(StandardCharsets.UTF_8);

        storage.save(storageKey, content);

        assertThat(storage.read(storageKey)).isEqualTo(content);
        assertThat(storage.exists(storageKey)).isTrue();
        assertThat(storageRoot.resolve(storageKey)).exists().isRegularFile();
    }

    @Test
    void deleteFileUnderConfiguredRoot() {
        LocalFileSystemStorageService storage = storageService();
        String storageKey = "exports/be-001/export.pptx";

        storage.save(storageKey, "pptx-bytes".getBytes(StandardCharsets.UTF_8));
        assertThat(storage.exists(storageKey)).isTrue();

        storage.delete(storageKey);

        assertThat(storage.exists(storageKey)).isFalse();
        assertThatThrownBy(() -> storage.read(storageKey))
                .isInstanceOf(StorageObjectNotFoundException.class)
                .hasMessageContaining("Storage object not found");
    }

    @Test
    void rejectPathTraversalAttempts() {
        LocalFileSystemStorageService storage = storageService();

        assertThatThrownBy(() -> storage.save("../escape.png", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsafe path segments");
        assertThatThrownBy(() -> storage.save("source-images/../../escape.png", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsafe path segments");
        assertThatThrownBy(() -> storage.read("/tmp/escape.png"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("relative");

        assertThat(storageRoot.resolve("escape.png")).doesNotExist();
    }

    @Test
    void rejectUnsupportedOrUnsafePaths() {
        LocalFileSystemStorageService storage = storageService();

        assertThatThrownBy(() -> storage.save("source-images/song-1/malware.exe", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not supported");
        assertThatThrownBy(() -> storage.save("misc/song-1/source.png", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not supported");
        assertThatThrownBy(() -> storage.save("source-images/song 1/source.png", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsupported path segments");
        assertThatThrownBy(() -> storage.save("source-images\\song-1\\source.png", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsupported path characters");
    }

    @Test
    void allowSafeNestedPathsForSourceImagesAndExports() throws Exception {
        LocalFileSystemStorageService storage = storageService();
        String sourceImageKey = "source-images/BE/001/original-image.PNG";
        String exportKey = "exports/BE/001/generated/slides.zip";

        storage.save(sourceImageKey, new byte[] {1, 2, 3});
        storage.save(exportKey, new byte[] {4, 5, 6});

        assertThat(storage.read(sourceImageKey)).containsExactly(1, 2, 3);
        assertThat(storage.read(exportKey)).containsExactly(4, 5, 6);
        try (Stream<Path> storedFiles = Files.walk(storageRoot)) {
            assertThat(storedFiles
                    .filter(Files::isRegularFile)
                    .map(storageRoot::relativize)
                    .map(Path::toString))
                    .containsExactlyInAnyOrder(
                            Path.of(sourceImageKey).toString(),
                            Path.of(exportKey).toString()
                    );
        }
    }

    private LocalFileSystemStorageService storageService() {
        return new LocalFileSystemStorageService(new LocalStorageProperties(storageRoot.toString()));
    }
}
