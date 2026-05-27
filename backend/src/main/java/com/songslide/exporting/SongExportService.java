package com.songslide.exporting;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.songslide.arrangement.SongArrangement;
import com.songslide.arrangement.SongArrangementRepository;
import com.songslide.common.exception.ResourceNotFoundException;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
import com.songslide.storage.BinaryStorageService;
import com.songslide.storage.StorageException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SongExportService {

    private final SongRepository songRepository;
    private final SongArrangementRepository arrangementRepository;
    private final SongExportRepository songExportRepository;
    private final SongExportPayloadBuilder payloadBuilder;
    private final ExportServiceClient exportServiceClient;
    private final BinaryStorageService storageService;
    private final ObjectMapper objectMapper;

    public SongExportService(
            SongRepository songRepository,
            SongArrangementRepository arrangementRepository,
            SongExportRepository songExportRepository,
            SongExportPayloadBuilder payloadBuilder,
            ExportServiceClient exportServiceClient,
            BinaryStorageService storageService,
            ObjectMapper objectMapper
    ) {
        this.songRepository = songRepository;
        this.arrangementRepository = arrangementRepository;
        this.songExportRepository = songExportRepository;
        this.payloadBuilder = payloadBuilder;
        this.exportServiceClient = exportServiceClient;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
    }

    @Transactional(noRollbackFor = {ExportServiceException.class, StorageException.class})
    public SongExportResponse createExport(UUID songId, SongExportRequest request) {
        Song song = getSong(songId);
        SongArrangement arrangement = getArrangement(request.arrangementId());
        if (!arrangement.getSong().getId().equals(songId)) {
            throw new IllegalArgumentException("Arrangement does not belong to song: " + songId);
        }

        ExportBuildResult buildResult = payloadBuilder.build(
                song,
                arrangement.getContentJson(),
                request.selectedVerses(),
                request.refrainMode(),
                request.outputFormat(),
                request.layout()
        );

        SongExport songExport = new SongExport();
        songExport.setSong(song);
        songExport.setArrangement(arrangement);
        songExport.setFormat(request.outputFormat());
        songExport.setStatus(SongExportStatus.PENDING);
        songExport.setSelectedVersesJson(objectMapper.valueToTree(buildResult.selectedVerses()));
        songExport.setRefrainMode(request.refrainMode());
        songExport.setOptionsJson(buildResult.optionsJson());
        SongExport savedExport = songExportRepository.saveAndFlush(songExport);

        try {
            byte[] output = exportServiceClient.export(request.outputFormat(), buildResult.payload());
            String storageKey = storageKey(songId, savedExport.getId(), request.outputFormat());
            storageService.save(storageKey, output);

            savedExport.setStorageKey(storageKey);
            savedExport.setStatus(SongExportStatus.COMPLETED);
            savedExport.setErrorMessage(null);
            return SongExportMapper.toResponse(songExportRepository.save(savedExport));
        } catch (ExportServiceException | StorageException exception) {
            savedExport.setStatus(SongExportStatus.FAILED);
            savedExport.setErrorMessage(exception.getMessage());
            songExportRepository.save(savedExport);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public SongExport getCompletedExport(UUID exportId) {
        SongExport songExport = songExportRepository.findById(exportId)
                .orElseThrow(() -> new ResourceNotFoundException("Export not found: " + exportId));

        if (songExport.getStatus() != SongExportStatus.COMPLETED || songExport.getStorageKey() == null) {
            throw new IllegalArgumentException("Export is not completed: " + exportId);
        }
        return songExport;
    }

    @Transactional(readOnly = true)
    public SongExport getCompletedExportWithMetadata(UUID exportId) {
        SongExport songExport = songExportRepository.findWithSongAndSongBookById(exportId)
                .orElseThrow(() -> new ResourceNotFoundException("Export not found: " + exportId));

        if (songExport.getStatus() != SongExportStatus.COMPLETED || songExport.getStorageKey() == null) {
            throw new IllegalArgumentException("Export is not completed: " + exportId);
        }
        return songExport;
    }

    public byte[] readExportFile(SongExport songExport) {
        return storageService.read(songExport.getStorageKey());
    }

    private Song getSong(UUID songId) {
        return songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found: " + songId));
    }

    private SongArrangement getArrangement(UUID arrangementId) {
        return arrangementRepository.findById(arrangementId)
                .orElseThrow(() -> new ResourceNotFoundException("Arrangement not found: " + arrangementId));
    }

    private String storageKey(UUID songId, UUID exportId, SongExportFormat format) {
        return "exports/%s/%s/songslide-export.%s".formatted(songId, exportId, format.fileExtension());
    }
}
