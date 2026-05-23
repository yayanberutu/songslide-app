package com.songslide.arrangement;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongArrangementRepository extends JpaRepository<SongArrangement, UUID> {

    Optional<SongArrangement> findBySong_IdAndIsDefaultTrue(UUID songId);
}
