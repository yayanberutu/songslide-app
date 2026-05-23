package com.songslide.songbook;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongBookRepository extends JpaRepository<SongBook, UUID> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, UUID id);

    Optional<SongBook> findByCode(String code);
}
