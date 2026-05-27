package com.songslide.exporting;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongExportRepository extends JpaRepository<SongExport, UUID> {

    @EntityGraph(attributePaths = {"song", "song.songBook"})
    Optional<SongExport> findWithSongAndSongBookById(UUID id);
}
