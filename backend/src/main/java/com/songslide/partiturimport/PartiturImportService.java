package com.songslide.partiturimport;

import com.songslide.common.exception.ResourceNotFoundException;
import com.songslide.config.SourceImageProperties;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
import com.songslide.storage.BinaryStorageService;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PartiturImportService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("png", "jpg", "jpeg", "pdf");

    private final SongRepository songRepository;
    private final BinaryStorageService storageService;
    private final SourceImageProperties properties;
    private final OcrServiceClient ocrClient;

    public PartiturImportService(
            SongRepository songRepository,
            BinaryStorageService storageService,
            SourceImageProperties properties,
            OcrServiceClient ocrClient
    ) {
        this.songRepository = songRepository;
        this.storageService = storageService;
        this.properties = properties;
        this.ocrClient = ocrClient;
    }

    @Transactional
    public PartiturImportResponse importPartitur(UUID songId, MultipartFile file) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found: " + songId));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File partitur wajib diunggah.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "partitur.png";
        }

        String extension = getExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Tipe file partitur harus berupa PNG, JPG, JPEG, atau PDF.");
        }

        long maxBytes = properties.maxSizeBytes();
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("Ukuran file melebihi batas maksimal " + properties.maxSizeMb() + "MB.");
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exc) {
            throw new IllegalStateException("Gagal membaca file unggahan: " + exc.getMessage(), exc);
        }

        // 1. Save original raw file to storage
        String storageKey = "partitur-imports/" + song.getId() + "/" + UUID.randomUUID() + "." + extension;
        storageService.save(storageKey, content);

        // 2. Call OCR service for OMR conversion
        PartiturOmrResult omrResult = ocrClient.extractStaffNotation(content, originalFilename);

        // 3. Return draft response (does not persist directly to arrangement)
        return new PartiturImportResponse(
                omrResult.status(),
                storageKey,
                originalFilename,
                omrResult.detectedKeySignature(),
                omrResult.detectedTimeSignature(),
                omrResult.noteCount(),
                omrResult.measureCount(),
                omrResult.lines(),
                omrResult.rawNotation(),
                omrResult.warnings()
        );
    }

    private String getExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }
}
