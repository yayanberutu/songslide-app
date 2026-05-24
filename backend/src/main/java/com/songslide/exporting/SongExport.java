package com.songslide.exporting;

import com.fasterxml.jackson.databind.JsonNode;
import com.songslide.arrangement.SongArrangement;
import com.songslide.song.Song;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "song_exports")
public class SongExport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_arrangement_id", nullable = false)
    private SongArrangement arrangement;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 16)
    private SongExportFormat format;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SongExportStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "selected_verses_json", nullable = false, columnDefinition = "jsonb")
    private JsonNode selectedVersesJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "refrain_mode", nullable = false, length = 64)
    private RefrainMode refrainMode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options_json", columnDefinition = "jsonb")
    private JsonNode optionsJson;

    @Column(name = "storage_key", length = 512)
    private String storageKey;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public Song getSong() {
        return song;
    }

    public void setSong(Song song) {
        this.song = song;
    }

    public SongArrangement getArrangement() {
        return arrangement;
    }

    public void setArrangement(SongArrangement arrangement) {
        this.arrangement = arrangement;
    }

    public SongExportFormat getFormat() {
        return format;
    }

    public void setFormat(SongExportFormat format) {
        this.format = format;
    }

    public SongExportStatus getStatus() {
        return status;
    }

    public void setStatus(SongExportStatus status) {
        this.status = status;
    }

    public JsonNode getSelectedVersesJson() {
        return selectedVersesJson;
    }

    public void setSelectedVersesJson(JsonNode selectedVersesJson) {
        this.selectedVersesJson = selectedVersesJson;
    }

    public RefrainMode getRefrainMode() {
        return refrainMode;
    }

    public void setRefrainMode(RefrainMode refrainMode) {
        this.refrainMode = refrainMode;
    }

    public JsonNode getOptionsJson() {
        return optionsJson;
    }

    public void setOptionsJson(JsonNode optionsJson) {
        this.optionsJson = optionsJson;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
