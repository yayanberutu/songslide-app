package com.songslide.sourceimage;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongSourceImageRepository extends JpaRepository<SongSourceImage, UUID> {

    List<SongSourceImage> findBySong_IdOrderByCreatedAtAscIdAsc(UUID songId);
}
