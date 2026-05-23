package com.songslide.arrangement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.songslide.common.exception.ResourceNotFoundException;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SongArrangementService {

    private final SongArrangementRepository songArrangementRepository;
    private final SongRepository songRepository;
    private final ArrangementContentValidator contentValidator;
    private final ObjectMapper objectMapper;

    public SongArrangementService(
            SongArrangementRepository songArrangementRepository,
            SongRepository songRepository,
            ArrangementContentValidator contentValidator,
            ObjectMapper objectMapper
    ) {
        this.songArrangementRepository = songArrangementRepository;
        this.songRepository = songRepository;
        this.contentValidator = contentValidator;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SongArrangementResponse createDefault(UUID songId) {
        Song song = getSong(songId);

        return songArrangementRepository.findBySong_IdAndIsDefaultTrue(songId)
                .map(SongArrangementMapper::toResponse)
                .orElseGet(() -> createDefaultArrangement(song));
    }

    @Transactional(readOnly = true)
    public SongArrangementResponse getDefault(UUID songId) {
        getSong(songId);

        return songArrangementRepository.findBySong_IdAndIsDefaultTrue(songId)
                .map(SongArrangementMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Default arrangement not found for song: " + songId
                ));
    }

    @Transactional(readOnly = true)
    public SongArrangementResponse get(UUID arrangementId) {
        return SongArrangementMapper.toResponse(getArrangement(arrangementId));
    }

    @Transactional
    public SongArrangementResponse updateContent(UUID arrangementId, ArrangementContentRequest request) {
        SongArrangement arrangement = getArrangement(arrangementId);
        contentValidator.validate(request.contentJson());
        arrangement.setContentJson(request.contentJson());
        return SongArrangementMapper.toResponse(songArrangementRepository.save(arrangement));
    }

    private SongArrangementResponse createDefaultArrangement(Song song) {
        JsonNode defaultContent = defaultContentJson();
        contentValidator.validate(defaultContent);

        SongArrangement arrangement = new SongArrangement();
        arrangement.setSong(song);
        arrangement.setName("Default");
        arrangement.setIsDefault(true);
        arrangement.setContentJson(defaultContent);
        arrangement.setLayoutJson(objectMapper.createObjectNode());

        return SongArrangementMapper.toResponse(songArrangementRepository.save(arrangement));
    }

    private Song getSong(UUID songId) {
        return songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found: " + songId));
    }

    private SongArrangement getArrangement(UUID arrangementId) {
        return songArrangementRepository.findById(arrangementId)
                .orElseThrow(() -> new ResourceNotFoundException("Arrangement not found: " + arrangementId));
    }

    private JsonNode defaultContentJson() {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("structureVersion", "1.0");
        root.putArray("sections")
                .addObject()
                .put("id", "verse")
                .put("type", "VERSE")
                .put("label", "Ayat")
                .put("repeatable", true)
                .putArray("lines");
        return root;
    }
}
