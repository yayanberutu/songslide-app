package com.songslide.songbook;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class SongBookControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SongBookRepository songBookRepository;

    @BeforeEach
    void setUp() {
        songBookRepository.deleteAll();
    }

    @Test
    void createSongBook() throws Exception {
        mockMvc.perform(post("/api/song-books")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "test",
                                  "name": "Test Book",
                                  "description": "Manual test book",
                                  "displayOrder": 7,
                                  "active": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.errorMessage").value(nullValue()))
                .andExpect(jsonPath("$.data.code").value("TEST"))
                .andExpect(jsonPath("$.data.name").value("Test Book"))
                .andExpect(jsonPath("$.data.description").value("Manual test book"))
                .andExpect(jsonPath("$.data.displayOrder").value(7))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void listSongBooksSortedByDisplayOrderThenCode() throws Exception {
        createSongBook("BETA", "Beta Book", 2);
        createSongBook("ALPHA", "Alpha Book", 1);
        createSongBook("GAMMA", "Gamma Book", 2);

        mockMvc.perform(get("/api/song-books").contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data[0].code").value("ALPHA"))
                .andExpect(jsonPath("$.data[1].code").value("BETA"))
                .andExpect(jsonPath("$.data[2].code").value("GAMMA"));
    }

    @Test
    void getUpdateAndDeleteSongBook() throws Exception {
        String id = createSongBook("OLD", "Old Book", 3);

        mockMvc.perform(get("/api/song-books/{id}", id).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.code").value("OLD"));

        mockMvc.perform(put("/api/song-books/{id}", id)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "new",
                                  "name": "New Book",
                                  "description": "Updated",
                                  "displayOrder": 4,
                                  "active": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.code").value("NEW"))
                .andExpect(jsonPath("$.data.name").value("New Book"))
                .andExpect(jsonPath("$.data.active").value(false));

        mockMvc.perform(delete("/api/song-books/{id}", id).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.deleted").value(true));

        mockMvc.perform(get("/api/song-books/{id}", id).contextPath("/api"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.errorMessage").value(containsString("Song book not found")));
    }

    @Test
    void rejectMissingRequiredFields() throws Exception {
        mockMvc.perform(post("/api/song-books")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "",
                                  "name": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value("code is required"));
    }

    @Test
    void rejectDuplicateBookCodes() throws Exception {
        createSongBook("DUP", "First Book", 1);

        mockMvc.perform(post("/api/song-books")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "dup",
                                  "name": "Duplicate Book"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value("Song book code 'DUP' already exists"));
    }

    private String createSongBook(String code, String name, int displayOrder) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/song-books")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "%s",
                                  "name": "%s",
                                  "displayOrder": %d,
                                  "active": true
                                }
                                """.formatted(code, name, displayOrder)))
                .andExpect(status().isOk())
                .andReturn();

        return com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.data.id"
        );
    }
}
