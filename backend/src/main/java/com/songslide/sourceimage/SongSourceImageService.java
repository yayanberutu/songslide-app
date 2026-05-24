package com.songslide.sourceimage;

import com.songslide.common.exception.ResourceNotFoundException;
import com.songslide.config.SourceImageProperties;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
import com.songslide.storage.BinaryStorageService;
import com.songslide.storage.StorageException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SongSourceImageService {

    private static final int MAX_ORIGINAL_FILENAME_LENGTH = 255;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/png", "image/jpeg");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("png", "jpg", "jpeg");

    private final SongSourceImageRepository sourceImageRepository;
    private final SongRepository songRepository;
    private final BinaryStorageService storageService;
    private final SourceImageProperties properties;

    public SongSourceImageService(
            SongSourceImageRepository sourceImageRepository,
            SongRepository songRepository,
            BinaryStorageService storageService,
            SourceImageProperties properties
    ) {
        this.sourceImageRepository = sourceImageRepository;
        this.songRepository = songRepository;
        this.storageService = storageService;
        this.properties = properties;
    }

    @Transactional
    public SongSourceImageResponse upload(UUID songId, MultipartFile file, Integer pageNumber) {
        Song song = getSong(songId);
        validatePageNumber(pageNumber);
        validateFilePresent(file);
        String originalFilename = validateOriginalFilename(file.getOriginalFilename());
        String contentType = normalizeContentType(file.getContentType());
        String extension = validateExtension(originalFilename, contentType);
        validateFileSize(file.getSize());
        byte[] content = readFile(file);
        ImageDimensions dimensions = validateReadableImage(content);

        String storageKey = storageKey(songId, UUID.randomUUID(), extension);
        boolean savedToStorage = false;
        try {
            storageService.save(storageKey, content);
            savedToStorage = true;

            SongSourceImage sourceImage = new SongSourceImage();
            sourceImage.setSong(song);
            sourceImage.setStorageKey(storageKey);
            sourceImage.setOriginalFilename(originalFilename);
            sourceImage.setContentType(contentType);
            sourceImage.setSizeBytes(content.length);
            sourceImage.setPageNumber(pageNumber);
            sourceImage.setWidthPx(dimensions.width());
            sourceImage.setHeightPx(dimensions.height());

            return SongSourceImageMapper.toResponse(sourceImageRepository.save(sourceImage));
        } catch (RuntimeException exception) {
            if (savedToStorage) {
                try {
                    storageService.delete(storageKey);
                } catch (RuntimeException cleanupException) {
                    exception.addSuppressed(cleanupException);
                }
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<SongSourceImageResponse> list(UUID songId) {
        getSong(songId);
        return sourceImageRepository.findBySong_IdOrderByCreatedAtAscIdAsc(songId)
                .stream()
                .map(SongSourceImageMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SongSourceImageFile getFile(UUID sourceImageId) {
        SongSourceImage sourceImage = getSourceImage(sourceImageId);
        byte[] content = storageService.read(sourceImage.getStorageKey());
        return new SongSourceImageFile(
                sourceImage.getOriginalFilename(),
                sourceImage.getContentType(),
                content
        );
    }

    private Song getSong(UUID songId) {
        return songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found: " + songId));
    }

    private SongSourceImage getSourceImage(UUID sourceImageId) {
        return sourceImageRepository.findById(sourceImageId)
                .orElseThrow(() -> new ResourceNotFoundException("Source image not found: " + sourceImageId));
    }

    private void validatePageNumber(Integer pageNumber) {
        if (pageNumber != null && pageNumber <= 0) {
            throw new IllegalArgumentException("pageNumber must be positive");
        }
    }

    private void validateFilePresent(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is required");
        }
    }

    private String validateOriginalFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("original filename is required");
        }
        String normalized = originalFilename.trim();
        if (normalized.length() > MAX_ORIGINAL_FILENAME_LENGTH) {
            throw new IllegalArgumentException("original filename must be 255 characters or fewer");
        }
        if (normalized.contains("/") || normalized.contains("\\") || normalized.contains("\u0000")) {
            throw new IllegalArgumentException("original filename contains unsupported path characters");
        }
        return normalized;
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException("contentType must be image/png or image/jpeg");
        }

        String normalized = contentType.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("contentType must be image/png or image/jpeg");
        }
        return normalized;
    }

    private String validateExtension(String originalFilename, String contentType) {
        int extensionStart = originalFilename.lastIndexOf('.');
        if (extensionStart < 1 || extensionStart == originalFilename.length() - 1) {
            throw new IllegalArgumentException("file extension must be png, jpg, or jpeg");
        }

        String extension = originalFilename.substring(extensionStart + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("file extension must be png, jpg, or jpeg");
        }
        if ("image/png".equals(contentType) && !"png".equals(extension)) {
            throw new IllegalArgumentException("image/png uploads must use a .png file extension");
        }
        if ("image/jpeg".equals(contentType) && !Set.of("jpg", "jpeg").contains(extension)) {
            throw new IllegalArgumentException("image/jpeg uploads must use a .jpg or .jpeg file extension");
        }
        return extension;
    }

    private void validateFileSize(long size) {
        if (size <= 0) {
            throw new IllegalArgumentException("file is required");
        }
        if (size > properties.maxSizeBytes()) {
            throw new IllegalArgumentException(
                    "file size must be " + properties.maxSizeMb() + " MB or smaller"
            );
        }
    }

    private byte[] readFile(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new StorageException("Failed to read uploaded file", exception);
        }
    }

    private ImageDimensions validateReadableImage(byte[] content) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(content));
            if (image == null) {
                throw new IllegalArgumentException("file content must be a readable PNG or JPEG image");
            }
            return new ImageDimensions(image.getWidth(), image.getHeight());
        } catch (IOException exception) {
            throw new IllegalArgumentException("file content must be a readable PNG or JPEG image", exception);
        }
    }

    private String storageKey(UUID songId, UUID fileId, String extension) {
        return "source-images/%s/%s.%s".formatted(songId, fileId, extension);
    }

    public record SongSourceImageFile(
            String originalFilename,
            String contentType,
            byte[] content
    ) {
    }

    private record ImageDimensions(
            int width,
            int height
    ) {
    }
}
