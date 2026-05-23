package com.songslide.songbook;

import com.songslide.common.exception.DuplicateResourceException;
import com.songslide.common.exception.ResourceNotFoundException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SongBookService {

    private final SongBookRepository songBookRepository;

    public SongBookService(SongBookRepository songBookRepository) {
        this.songBookRepository = songBookRepository;
    }

    @Transactional
    public SongBookResponse create(SongBookRequest request) {
        String code = normalizeCode(request.code());
        if (songBookRepository.existsByCode(code)) {
            throw new DuplicateResourceException("Song book code '" + code + "' already exists");
        }

        SongBook songBook = new SongBook();
        applyRequest(songBook, request, code, false);

        return SongBookMapper.toResponse(songBookRepository.save(songBook));
    }

    @Transactional(readOnly = true)
    public List<SongBookResponse> list() {
        Sort sort = Sort.by(
                Sort.Order.asc("displayOrder"),
                Sort.Order.asc("code")
        );

        return songBookRepository.findAll(sort)
                .stream()
                .map(SongBookMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SongBookResponse get(UUID id) {
        return SongBookMapper.toResponse(getSongBook(id));
    }

    @Transactional
    public SongBookResponse update(UUID id, SongBookRequest request) {
        SongBook songBook = getSongBook(id);
        String code = normalizeCode(request.code());

        if (!songBook.getCode().equals(code) && songBookRepository.existsByCodeAndIdNot(code, id)) {
            throw new DuplicateResourceException("Song book code '" + code + "' already exists");
        }

        applyRequest(songBook, request, code, true);
        return SongBookMapper.toResponse(songBookRepository.save(songBook));
    }

    @Transactional
    public void delete(UUID id) {
        SongBook songBook = getSongBook(id);
        songBookRepository.delete(songBook);
        songBookRepository.flush();
    }

    private SongBook getSongBook(UUID id) {
        return songBookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Song book not found: " + id));
    }

    private void applyRequest(SongBook songBook, SongBookRequest request, String code, boolean preserveNullable) {
        songBook.setCode(code);
        songBook.setName(request.name().trim());
        songBook.setDescription(normalizeNullable(request.description()));
        songBook.setDisplayOrder(resolveDisplayOrder(songBook, request, preserveNullable));
        songBook.setActive(resolveActive(songBook, request, preserveNullable));
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Integer resolveDisplayOrder(SongBook songBook, SongBookRequest request, boolean preserveNullable) {
        if (request.displayOrder() != null) {
            return request.displayOrder();
        }
        if (preserveNullable) {
            return songBook.getDisplayOrder();
        }
        return 0;
    }

    private Boolean resolveActive(SongBook songBook, SongBookRequest request, boolean preserveNullable) {
        if (request.active() != null) {
            return request.active();
        }
        if (preserveNullable) {
            return songBook.getActive();
        }
        return true;
    }
}
