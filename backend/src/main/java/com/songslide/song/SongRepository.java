package com.songslide.song;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SongRepository extends JpaRepository<Song, UUID> {

    boolean existsBySongBook_IdAndSongNumber(UUID songBookId, String songNumber);

    boolean existsBySongBook_IdAndSongNumberAndIdNot(UUID songBookId, String songNumber, UUID id);

    @Query("""
            SELECT song
            FROM Song song
            JOIN FETCH song.songBook book
            WHERE (:bookCode IS NULL OR book.code = :bookCode)
              AND (:title IS NULL OR LOWER(song.title) LIKE LOWER(CONCAT('%', :title, '%')))
              AND (:songNumber IS NULL OR song.songNumber = :songNumber)
            ORDER BY book.code ASC, song.songNumber ASC, song.title ASC
            """)
    List<Song> search(
            @Param("bookCode") String bookCode,
            @Param("title") String title,
            @Param("songNumber") String songNumber
    );
}
