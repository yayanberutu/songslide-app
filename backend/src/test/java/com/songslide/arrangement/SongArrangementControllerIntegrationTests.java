package com.songslide.arrangement;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
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
class SongArrangementControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SongArrangementRepository songArrangementRepository;

    @Autowired
    private SongRepository songRepository;

    @Autowired
    private SongBookRepository songBookRepository;

    private Song song;

    @BeforeEach
    void setUp() {
        songArrangementRepository.deleteAll();
        songRepository.deleteAll();
        songBookRepository.deleteAll();

        SongBook songBook = new SongBook();
        songBook.setCode("BE");
        songBook.setName("Buku Ende");
        songBook.setDisplayOrder(1);
        songBook.setActive(true);
        SongBook savedBook = songBookRepository.save(songBook);

        Song newSong = new Song();
        newSong.setSongBook(savedBook);
        newSong.setSongNumber("1");
        newSong.setTitle("Arrangement Test Song");
        song = songRepository.save(newSong);
    }

    @Test
    void createAndGetDefaultArrangement() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/songs/{songId}/arrangements/default", song.getId())
                        .contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.errorMessage").value(nullValue()))
                .andExpect(jsonPath("$.data.songId").value(song.getId().toString()))
                .andExpect(jsonPath("$.data.name").value("Default"))
                .andExpect(jsonPath("$.data.isDefault").value(true))
                .andExpect(jsonPath("$.data.contentJson.structureVersion").value("1.0"))
                .andExpect(jsonPath("$.data.contentJson.sections[0].type").value("VERSE"))
                .andReturn();

        String arrangementId = JsonPath.read(
                createResult.getResponse().getContentAsString(),
                "$.data.id"
        );

        mockMvc.perform(get("/api/songs/{songId}/arrangements/default", song.getId()).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(arrangementId))
                .andExpect(jsonPath("$.data.contentJson.sections[0].lines.length()").value(0));

        mockMvc.perform(get("/api/arrangements/{arrangementId}", arrangementId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(arrangementId))
                .andExpect(jsonPath("$.data.songId").value(song.getId().toString()));
    }

    @Test
    void updateContentJsonWithVerseRefrainAndTextOnlyVerses() throws Exception {
        String arrangementId = createDefaultArrangement();

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "structureVersion": "1.0",
                                    "sections": [
                                      {
                                        "id": "verse",
                                        "type": "VERSE",
                                        "label": "Ayat",
                                        "repeatable": true,
                                        "lines": [
                                          {
                                            "lineOrder": 1,
                                            "notation": "5 .6 5 5 6 | 1 .2 1 .6",
                                            "lyricsByVerse": {
                                              "1": "Bi-la ku-re-nung do-sa-ku",
                                              "2": "Ra-sa ang-kuh dan som-bong-ku"
                                            }
                                          }
                                        ]
                                      },
                                      {
                                        "id": "refrain",
                                        "type": "REFRAIN",
                                        "label": "Refrein",
                                        "repeatable": false,
                                        "lines": [
                                          {
                                            "lineOrder": 1,
                                            "notation": "1 .2 3 3 2 | 3...0",
                                            "lyric": "Ka-sih sa-yang-Mu"
                                          }
                                        ]
                                      },
                                      {
                                        "id": "additional-verses",
                                        "type": "TEXT_ONLY_VERSES",
                                        "label": "Ayat Tambahan",
                                        "verses": {
                                          "3": "Text-only verse 3",
                                          "4": "Text-only verse 4"
                                        }
                                      }
                                    ]
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(arrangementId))
                .andExpect(jsonPath("$.data.contentJson.sections[0].type").value("VERSE"))
                .andExpect(jsonPath("$.data.contentJson.sections[0].lines[0].lyricsByVerse.1")
                        .value("Bi-la ku-re-nung do-sa-ku"))
                .andExpect(jsonPath("$.data.contentJson.sections[1].type").value("REFRAIN"))
                .andExpect(jsonPath("$.data.contentJson.sections[1].lines[0].lyric")
                        .value("Ka-sih sa-yang-Mu"))
                .andExpect(jsonPath("$.data.contentJson.sections[2].type").value("TEXT_ONLY_VERSES"))
                .andExpect(jsonPath("$.data.contentJson.sections[2].verses.3").value("Text-only verse 3"));
    }

    @Test
    void allowDraftLikeIncompleteLineContentWhenStructureIsValid() throws Exception {
        String arrangementId = createDefaultArrangement();

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "structureVersion": "1.0",
                                    "sections": [
                                      {
                                        "id": "verse",
                                        "type": "VERSE",
                                        "label": "Ayat",
                                        "repeatable": true,
                                        "lines": [
                                          {
                                            "lineOrder": 1
                                          },
                                          {
                                            "notation": ""
                                          }
                                        ]
                                      },
                                      {
                                        "id": "refrain",
                                        "type": "REFRAIN",
                                        "label": "Refrein",
                                        "repeatable": false,
                                        "lines": []
                                      }
                                    ]
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.contentJson.sections[0].lines.length()").value(2));
    }

    @Test
    void rejectInvalidSectionTypesAndMalformedContentStructures() throws Exception {
        String arrangementId = createDefaultArrangement();

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "structureVersion": "1.0",
                                    "sections": [
                                      {
                                        "id": "bridge",
                                        "type": "BRIDGE",
                                        "label": "Bridge"
                                      }
                                    ]
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value(
                        "contentJson.sections[0].type 'BRIDGE' is not supported"
                ));

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "structureVersion": "1.0",
                                    "sections": "not-an-array"
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorMessage").value("contentJson.sections must be an array"));

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "structureVersion": "1.0",
                                    "sections": [
                                      {
                                        "id": "verse",
                                        "type": "VERSE",
                                        "lines": [
                                          {
                                            "lineOrder": 1,
                                            "lyricsByVerse": {
                                              "A": "Invalid verse key"
                                            }
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorMessage").value(containsString(
                        "lyricsByVerse keys must be positive verse numbers"
                )));

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "structureVersion": "1.0",
                                    "sections": [
                                      {
                                        "id": "additional-verses",
                                        "type": "TEXT_ONLY_VERSES",
                                        "verses": []
                                      }
                                    ]
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorMessage").value(
                        "contentJson.sections[0].verses must be an object"
                ));
    }

    @Test
    void rejectMissingOrUnsupportedStructureVersion() throws Exception {
        String arrangementId = createDefaultArrangement();

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "sections": []
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorMessage").value("contentJson.structureVersion is required"));

        mockMvc.perform(put("/api/arrangements/{arrangementId}/content", arrangementId)
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "contentJson": {
                                    "structureVersion": "2.0",
                                    "sections": []
                                  }
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorMessage").value("contentJson.structureVersion must be 1.0"));
    }

    private String createDefaultArrangement() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/songs/{songId}/arrangements/default", song.getId())
                        .contextPath("/api"))
                .andExpect(status().isOk())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }
}
