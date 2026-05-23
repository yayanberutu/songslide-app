package com.songslide.song;

import com.songslide.common.exception.DuplicateResourceException;
import com.songslide.common.exception.ResourceNotFoundException;
import com.songslide.songbook.SongBook;
import com.songslide.songbook.SongBookRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SongService {

    private final SongRepository songRepository;
    private final SongBookRepository songBookRepository;

    public SongService(SongRepository songRepository, SongBookRepository songBookRepository) {
        this.songRepository = songRepository;
        this.songBookRepository = songBookRepository;
    }

    @Transactional
    public SongResponse create(SongRequest request) {
        SongBook songBook = resolveSongBook(request);
        String songNumber = normalizeSongNumber(request.songNumber());
        assertSongNumberAvailable(songBook.getId(), songNumber, null);

        Song song = new Song();
        song.setSongBook(songBook);
        applyRequest(song, request, songNumber);

        return SongMapper.toResponse(songRepository.save(song));
    }

    @Transactional(readOnly = true)
    public List<SongResponse> list(String bookCode, String title, String songNumber) {
        String normalizedBookCode = normalizeOptionalCode(bookCode);
        String normalizedTitle = normalizeNullable(title);
        String normalizedSongNumber = normalizeOptionalSongNumber(songNumber);

        return songRepository.search(normalizedBookCode, normalizedTitle, normalizedSongNumber)
                .stream()
                .map(SongMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SongResponse get(UUID id) {
        return SongMapper.toResponse(getSong(id));
    }

    @Transactional
    public SongResponse update(UUID id, SongRequest request) {
        Song song = getSong(id);
        SongBook songBook = resolveSongBook(request);
        String songNumber = normalizeSongNumber(request.songNumber());
        assertSongNumberAvailable(songBook.getId(), songNumber, id);

        song.setSongBook(songBook);
        applyRequest(song, request, songNumber);

        return SongMapper.toResponse(songRepository.save(song));
    }

    @Transactional
    public void delete(UUID id) {
        Song song = getSong(id);
        songRepository.delete(song);
        songRepository.flush();
    }

    private Song getSong(UUID id) {
        return songRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found: " + id));
    }

    private SongBook resolveSongBook(SongRequest request) {
        String normalizedBookCode = normalizeOptionalCode(request.bookCode());

        if (request.songBookId() == null && normalizedBookCode == null) {
            throw new IllegalArgumentException("songBookId or bookCode is required");
        }

        SongBook songBook = request.songBookId() == null
                ? findSongBookByCode(normalizedBookCode)
                : findSongBookById(request.songBookId());

        if (normalizedBookCode != null && !songBook.getCode().equals(normalizedBookCode)) {
            throw new IllegalArgumentException("songBookId and bookCode refer to different song books");
        }

        return songBook;
    }

    private SongBook findSongBookById(UUID songBookId) {
        return songBookRepository.findById(songBookId)
                .orElseThrow(() -> new ResourceNotFoundException("Song book not found: " + songBookId));
    }

    private SongBook findSongBookByCode(String bookCode) {
        return songBookRepository.findByCode(bookCode)
                .orElseThrow(() -> new ResourceNotFoundException("Song book not found: " + bookCode));
    }

    private void assertSongNumberAvailable(UUID songBookId, String songNumber, UUID currentSongId) {
        boolean duplicate = currentSongId == null
                ? songRepository.existsBySongBook_IdAndSongNumber(songBookId, songNumber)
                : songRepository.existsBySongBook_IdAndSongNumberAndIdNot(songBookId, songNumber, currentSongId);

        if (duplicate) {
            throw new DuplicateResourceException(
                    "Song number '" + songNumber + "' already exists in this song book"
            );
        }
    }

    private void applyRequest(Song song, SongRequest request, String songNumber) {
        song.setSongNumber(songNumber);
        song.setTitle(request.title().trim());
        song.setKeySignature(normalizeNullable(request.defaultKey()));
        song.setTimeSignature(normalizeNullable(request.timeSignature()));
        song.setTempoBpm(request.tempo());
        song.setAuthor(normalizeNullable(request.authorText()));
        song.setNotes(normalizeNullable(request.sourceNote()));
    }

    private String normalizeSongNumber(String songNumber) {
        String normalized = songNumber.trim();
        validatePositiveSongNumber(normalized);
        return normalized;
    }

    private String normalizeOptionalSongNumber(String songNumber) {
        String normalized = normalizeNullable(songNumber);
        if (normalized == null) {
            return null;
        }
        validatePositiveSongNumber(normalized);
        return normalized;
    }

    private void validatePositiveSongNumber(String songNumber) {
        try {
            if (Integer.parseInt(songNumber) <= 0) {
                throw new IllegalArgumentException("songNumber must be positive");
            }
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("songNumber must be positive");
        }
    }

    private String normalizeOptionalCode(String code) {
        String normalized = normalizeNullable(code);
        if (normalized == null) {
            return null;
        }
        return normalized.toUpperCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
