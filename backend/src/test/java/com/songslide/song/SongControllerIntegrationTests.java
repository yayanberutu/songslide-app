package com.songslide.song;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.songslide.arrangement.SongArrangementRepository;
import com.songslide.songbook.SongBook;
import com.songslide.songbook.SongBookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@ActiveProfiles("test")
@AutoConfigureMockMvc
@SpringBootTest
class SongControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SongRepository songRepository;

    @Autowired
    private SongBookRepository songBookRepository;

    @Autowired
    private SongArrangementRepository songArrangementRepository;

    private SongBook beBook;
    private SongBook kjBook;

    @BeforeEach
    void setUp() {
        songArrangementRepository.deleteAll();
        songRepository.deleteAll();
        songBookRepository.deleteAll();
        beBook = createBook("BE", "Buku Ende", 1);
        kjBook = createBook("KJ", "Kidung Jemaat", 2);
    }

    @Test
    void createSongByBookCode() throws Exception {
        mockMvc.perform(post("/api/songs")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookCode": "be",
                                  "songNumber": "12",
                                  "title": "Sai Anju Ma Au",
                                  "defaultKey": "C",
                                  "timeSignature": "4/4",
                                  "tempo": 80,
                                  "authorText": "Traditional",
                                  "sourceNote": "Manual entry"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.errorMessage").value(nullValue()))
                .andExpect(jsonPath("$.data.songNumber").value("12"))
                .andExpect(jsonPath("$.data.title").value("Sai Anju Ma Au"))
                .andExpect(jsonPath("$.data.defaultKey").value("C"))
                .andExpect(jsonPath("$.data.timeSignature").value("4/4"))
                .andExpect(jsonPath("$.data.tempo").value(80))
                .andExpect(jsonPath("$.data.authorText").value("Traditional"))
                .andExpect(jsonPath("$.data.sourceNote").value("Manual entry"))
                .andExpect(jsonPath("$.data.songBook.id").value(beBook.getId().toString()))
                .andExpect(jsonPath("$.data.songBook.code").value("BE"))
                .andExpect(jsonPath("$.data.songBook.name").value("Buku Ende"));
    }

    @Test
    void listSongsSupportsBookFilterTitleSearchAndSongNumberSearch() throws Exception {
        createSong("BE", "1", "Alpha Song");
        createSong("BE", "2", "Amazing Grace");
        createSong("KJ", "2", "Amazing Love");

        mockMvc.perform(get("/api/songs")
                        .contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].title").value("Alpha Song"))
                .andExpect(jsonPath("$.data[1].title").value("Amazing Grace"))
                .andExpect(jsonPath("$.data[2].title").value("Amazing Love"));

        mockMvc.perform(get("/api/songs")
                        .contextPath("/api")
                        .param("title", "Amazing Grace"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].title").value("Amazing Grace"));

        mockMvc.perform(get("/api/songs")
                        .contextPath("/api")
                        .param("title", "amazing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].title").value("Amazing Grace"))
                .andExpect(jsonPath("$.data[1].title").value("Amazing Love"));

        mockMvc.perform(get("/api/songs")
                        .contextPath("/api")
                        .param("bookCode", "KJ"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].songBook.code").value("KJ"))
                .andExpect(jsonPath("$.data[0].title").value("Amazing Love"));

        mockMvc.perform(get("/api/songs")
                        .contextPath("/api")
                        .param("songNumber", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].songNumber").value("1"))
                .andExpect(jsonPath("$.data[0].title").value("Alpha Song"));
    }

    @Test
    void getUpdateAndDeleteSong() throws Exception {
        String songId = createSong("BE", "7", "Original Title");

        mockMvc.perform(get("/api/songs/{id}", songId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(songId))
                .andExpect(jsonPath("$.data.songBook.code").value("BE"))
                .andExpect(jsonPath("$.data.songNumber").value("7"));

        mockMvc.perform(put("/api/songs/{id}", songId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "songBookId": "%s",
                                  "bookCode": "KJ",
                                  "songNumber": "8",
                                  "title": "Updated Title",
                                  "defaultKey": "G",
                                  "timeSignature": "3/4",
                                  "tempo": 72,
                                  "authorText": "Updated Author",
                                  "sourceNote": "Updated note"
                                }
                                """.formatted(kjBook.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(songId))
                .andExpect(jsonPath("$.data.songBook.code").value("KJ"))
                .andExpect(jsonPath("$.data.songNumber").value("8"))
                .andExpect(jsonPath("$.data.title").value("Updated Title"))
                .andExpect(jsonPath("$.data.defaultKey").value("G"))
                .andExpect(jsonPath("$.data.timeSignature").value("3/4"))
                .andExpect(jsonPath("$.data.tempo").value(72))
                .andExpect(jsonPath("$.data.authorText").value("Updated Author"))
                .andExpect(jsonPath("$.data.sourceNote").value("Updated note"));

        mockMvc.perform(delete("/api/songs/{id}", songId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.deleted").value(true));

        mockMvc.perform(get("/api/songs/{id}", songId).contextPath("/api"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.errorMessage").value(containsString("Song not found")));
    }

    @Test
    void rejectDuplicateSongNumberWithinSameBook() throws Exception {
        createSong("BE", "10", "First Song");
        createSong("KJ", "10", "Same Number Different Book");

        mockMvc.perform(post("/api/songs")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookCode": "BE",
                                  "songNumber": "10",
                                  "title": "Duplicate Song"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value(
                        "Song number '10' already exists in this song book"
                ));
    }

    @Test
    void rejectMissingBookMissingTitleAndInvalidSongNumber() throws Exception {
        mockMvc.perform(post("/api/songs")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "songNumber": "1",
                                  "title": "No Book"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value("songBookId or bookCode is required"));

        mockMvc.perform(post("/api/songs")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookCode": "BE",
                                  "songNumber": "0",
                                  "title": "Invalid Number"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value("songNumber must be positive"));

        mockMvc.perform(post("/api/songs")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookCode": "BE",
                                  "songNumber": "1",
                                  "title": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value("title is required"));
    }

    private SongBook createBook(String code, String name, int displayOrder) {
        SongBook songBook = new SongBook();
        songBook.setCode(code);
        songBook.setName(name);
        songBook.setDisplayOrder(displayOrder);
        songBook.setActive(true);
        return songBookRepository.save(songBook);
    }

    private String createSong(String bookCode, String songNumber, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/songs")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookCode": "%s",
                                  "songNumber": "%s",
                                  "title": "%s"
                                }
                                """.formatted(bookCode, songNumber, title)))
                .andExpect(status().isOk())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }
}
