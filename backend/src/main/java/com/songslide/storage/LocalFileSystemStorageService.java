package com.songslide.storage;

import com.songslide.config.LocalStorageProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class LocalFileSystemStorageService implements BinaryStorageService {

    private static final int MAX_STORAGE_KEY_LENGTH = 512;
    private static final Pattern SAFE_SEGMENT_PATTERN = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]*");
    private static final Set<String> SOURCE_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> EXPORT_EXTENSIONS = Set.of("png", "pptx", "zip");

    private final Path root;

    public LocalFileSystemStorageService(LocalStorageProperties properties) {
        this.root = Path.of(properties.root()).toAbsolutePath().normalize();
        ensureRootDirectory();
    }

    @Override
    public void save(String storageKey, byte[] content) {
        Objects.requireNonNull(content, "content is required");

        Path path = resolveStorageKey(storageKey);

        try {
            Files.createDirectories(path.getParent());
            Files.write(
                    path,
                    content,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE
            );
        } catch (IOException exception) {
            throw new StorageException("Failed to save storage object: " + storageKey, exception);
        }
    }

    @Override
    public byte[] read(String storageKey) {
        Path path = resolveStorageKey(storageKey);

        if (!Files.isRegularFile(path)) {
            throw new StorageObjectNotFoundException("Storage object not found: " + storageKey);
        }

        try {
            return Files.readAllBytes(path);
        } catch (IOException exception) {
            throw new StorageException("Failed to read storage object: " + storageKey, exception);
        }
    }

    @Override
    public void delete(String storageKey) {
        Path path = resolveStorageKey(storageKey);

        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            throw new StorageException("Failed to delete storage object: " + storageKey, exception);
        }
    }

    @Override
    public boolean exists(String storageKey) {
        return Files.isRegularFile(resolveStorageKey(storageKey));
    }

    private Path resolveStorageKey(String storageKey) {
        validateStorageKey(storageKey);
        Path resolved = root.resolve(storageKey).normalize();

        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("storageKey must stay within the configured storage root");
        }

        return resolved;
    }

    private void validateStorageKey(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IllegalArgumentException("storageKey is required");
        }
        if (storageKey.length() > MAX_STORAGE_KEY_LENGTH) {
            throw new IllegalArgumentException("storageKey must be 512 characters or fewer");
        }
        if (storageKey.startsWith("/") || storageKey.startsWith("\\")) {
            throw new IllegalArgumentException("storageKey must be relative");
        }
        if (storageKey.contains("\\") || storageKey.contains(":")) {
            throw new IllegalArgumentException("storageKey contains unsupported path characters");
        }

        String[] segments = storageKey.split("/");
        for (String segment : segments) {
            validateSegment(segment);
        }
        if (segments.length < 3) {
            throw new IllegalArgumentException("storageKey must include namespace, owner, and file name segments");
        }

        validateNamespaceAndExtension(segments[0], segments[segments.length - 1]);
    }

    private void validateSegment(String segment) {
        if (segment.isBlank() || ".".equals(segment) || "..".equals(segment)) {
            throw new IllegalArgumentException("storageKey contains unsafe path segments");
        }
        if (!SAFE_SEGMENT_PATTERN.matcher(segment).matches()) {
            throw new IllegalArgumentException("storageKey contains unsupported path segments");
        }
    }

    private void validateNamespaceAndExtension(String namespace, String fileName) {
        String extension = getExtension(fileName);
        boolean supported = switch (namespace) {
            case "source-images" -> SOURCE_IMAGE_EXTENSIONS.contains(extension);
            case "exports" -> EXPORT_EXTENSIONS.contains(extension);
            default -> false;
        };

        if (!supported) {
            throw new IllegalArgumentException("storageKey namespace or file extension is not supported");
        }
    }

    private String getExtension(String fileName) {
        int extensionStart = fileName.lastIndexOf('.');
        if (extensionStart < 1 || extensionStart == fileName.length() - 1) {
            throw new IllegalArgumentException("storageKey file name must include a supported extension");
        }

        return fileName.substring(extensionStart + 1).toLowerCase(Locale.ROOT);
    }

    private void ensureRootDirectory() {
        try {
            Files.createDirectories(root);
        } catch (IOException exception) {
            throw new StorageException("Failed to create storage root: " + root, exception);
        }

        if (!Files.isDirectory(root)) {
            throw new StorageException("Storage root is not a directory: " + root);
        }
    }
}
