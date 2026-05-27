package com.songslide.exporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.songslide.arrangement.SongArrangement;
import com.songslide.arrangement.SongArrangementRepository;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
import com.songslide.songbook.SongBook;
import com.songslide.songbook.SongBookRepository;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.util.FileSystemUtils;

@ActiveProfiles("test")
@AutoConfigureMockMvc
@SpringBootTest
class SongExportControllerIntegrationTests {

    private static final AtomicInteger EXPORT_SERVICE_STATUS = new AtomicInteger(200);
    private static final List<RecordedExportRequest> EXPORT_REQUESTS = new CopyOnWriteArrayList<>();
    private static HttpServer exportServer;
    private static byte[] exportServiceResponse = "export-output".getBytes(StandardCharsets.UTF_8);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SongExportRepository songExportRepository;

    @Autowired
    private SongArrangementRepository songArrangementRepository;

    @Autowired
    private SongRepository songRepository;

    @Autowired
    private SongBookRepository songBookRepository;

    private Song song;
    private SongArrangement arrangement;

    @DynamicPropertySource
    static void exportServiceProperties(DynamicPropertyRegistry registry) {
        startExportServer();
        registry.add("songslide.export-service.url", () -> "http://localhost:" + exportServer.getAddress().getPort());
    }

    @BeforeEach
    void setUp() throws Exception {
        EXPORT_SERVICE_STATUS.set(200);
        EXPORT_REQUESTS.clear();
        exportServiceResponse = "export-output".getBytes(StandardCharsets.UTF_8);
        FileSystemUtils.deleteRecursively(Path.of("target/test-storage"));

        songExportRepository.deleteAll();
        songArrangementRepository.deleteAll();
        songRepository.deleteAll();
        songBookRepository.deleteAll();

        SongBook songBook = new SongBook();
        songBook.setCode("KJ");
        songBook.setName("Kidung Jemaat");
        songBook.setDisplayOrder(1);
        songBook.setActive(true);
        SongBook savedBook = songBookRepository.save(songBook);

        Song newSong = new Song();
        newSong.setSongBook(savedBook);
        newSong.setSongNumber("37");
        newSong.setTitle("Bila Kurenung Dosaku");
        newSong.setKeySignature("G");
        newSong.setTimeSignature("4/4");
        newSong.setTempoBpm(80);
        song = songRepository.save(newSong);

        SongArrangement newArrangement = new SongArrangement();
        newArrangement.setSong(song);
        newArrangement.setName("Default");
        newArrangement.setIsDefault(true);
        newArrangement.setContentJson(sampleContentJson());
        arrangement = songArrangementRepository.save(newArrangement);
    }

    @AfterEach
    void tearDown() throws IOException {
        songExportRepository.deleteAll();
        songArrangementRepository.deleteAll();
        songRepository.deleteAll();
        songBookRepository.deleteAll();
        FileSystemUtils.deleteRecursively(Path.of("target/test-storage"));
    }

    @AfterAll
    static void stopExportServer() {
        if (exportServer != null) {
            exportServer.stop(0);
        }
    }

    @Test
    void createPptxExportFromContentJsonAndDownloadStoredFile() throws Exception {
        exportServiceResponse = "pptx-output".getBytes(StandardCharsets.UTF_8);

        MvcResult result = mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PPTX", "NONE", "[1, 2]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.errorMessage").value(nullValue()))
                .andExpect(jsonPath("$.data.outputFormat").value("PPTX"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.selectedVerses[0]").value("1"))
                .andExpect(jsonPath("$.data.selectedVerses[1]").value("2"))
                .andExpect(jsonPath("$.data.refrainMode").value("NONE"))
                .andExpect(jsonPath("$.data.storageKey").value(containsString("/songslide-export.pptx")))
                .andExpect(jsonPath("$.data.downloadUrl").value(containsString("/api/exports/")))
                .andReturn();

        assertThat(EXPORT_REQUESTS).hasSize(1);
        assertThat(EXPORT_REQUESTS.get(0).path()).isEqualTo("/export/pptx");
        JsonNode payload = objectMapper.readTree(EXPORT_REQUESTS.get(0).body());
        assertThat(payload.path("slides")).hasSize(2);
        assertThat(payload.path("slides").get(0).path("title").asText())
                .isEqualTo("KJ 37 - Bila Kurenung Dosaku");
        assertThat(payload.path("slides").get(0).path("subtitle").asText()).isEqualTo("Ayat 1");
        assertThat(payload.path("slides").get(0).path("metadata").asText()).isEqualTo("Do = G | 4/4 | 80 BPM");
        assertThat(payload.path("slides").get(1).path("subtitle").asText()).isEqualTo("Ayat 2");
        assertThat(payload.path("layout").path("theme").asText()).isEqualTo("LIGHT");
        assertThat(payload.path("layout").path("showNotation").asBoolean()).isTrue();
        assertThat(payload.path("layout").path("textSizePreset").asText()).isEqualTo("MEDIUM");
        assertThat(payload.path("output").path("fileName").asText()).isEqualTo("songslide-export.pptx");

        String exportId = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(get("/api/exports/{exportId}/download", exportId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(
                        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                ))
                .andExpect(header().string("Content-Disposition", containsString("filename=\"KJ 37 - 1,2.pptx\"")))
                .andExpect(content().bytes("pptx-output".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void createMultipleSongsExportPptx() throws Exception {
        exportServiceResponse = "pptx-output-multiple".getBytes(StandardCharsets.UTF_8);

        String requestBody = """
                {
                  "fileName": "ibadah-minggu",
                  "outputFormat": "PPTX",
                  "layout": {
                    "theme": "LIGHT",
                    "showNotation": true,
                    "slideSize": "LAYOUT_WIDE",
                    "textSizePreset": "MEDIUM"
                  },
                  "items": [
                    {
                      "bookCode": "KJ",
                      "songNumber": "37",
                      "selectedVerses": ["2", "1"],
                      "refrainMode": "NONE",
                      "order": 1
                    }
                  ]
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/song-exports/multiple")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.outputFormat").value("PPTX"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.storageKey").value(containsString("/songslide-export.pptx")))
                .andReturn();

        assertThat(EXPORT_REQUESTS).hasSize(1);
        JsonNode payload = objectMapper.readTree(EXPORT_REQUESTS.get(0).body());
        assertThat(payload.path("slides")).hasSize(2);
        assertThat(payload.path("slides").get(0).path("subtitle").asText()).isEqualTo("Ayat 2");
        assertThat(payload.path("slides").get(1).path("subtitle").asText()).isEqualTo("Ayat 1");
        assertThat(payload.path("output").path("fileName").asText()).isEqualTo("ibadah-minggu.pptx");

        String exportId = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(get("/api/exports/{exportId}/download", exportId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("filename=\"ibadah-minggu.pptx\"")))
                .andExpect(content().bytes("pptx-output-multiple".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void createMultipleSongsExportStripsDuplicateExtension() throws Exception {
        exportServiceResponse = "zip-output-multiple".getBytes(StandardCharsets.UTF_8);

        String requestBody = """
                {
                  "fileName": "ibadah-minggu.zip",
                  "outputFormat": "PNG",
                  "layout": {
                    "theme": "LIGHT",
                    "showNotation": true,
                    "slideSize": "LAYOUT_WIDE",
                    "textSizePreset": "MEDIUM"
                  },
                  "items": [
                    {
                      "bookCode": "KJ",
                      "songNumber": "37",
                      "selectedVerses": ["1"],
                      "refrainMode": "NONE",
                      "order": 1
                    }
                  ]
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/song-exports/multiple")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andReturn();

        String exportId = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(get("/api/exports/{exportId}/download", exportId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("filename=\"ibadah-minggu.zip\"")))
                .andExpect(content().bytes("zip-output-multiple".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void createMultipleSongsExportStripsDuplicatePptxExtension() throws Exception {
        exportServiceResponse = "pptx-output-multiple".getBytes(StandardCharsets.UTF_8);

        String requestBody = """
                {
                  "fileName": "ibadah-minggu.pptx",
                  "outputFormat": "PPTX",
                  "layout": {
                    "theme": "LIGHT",
                    "showNotation": true,
                    "slideSize": "LAYOUT_WIDE",
                    "textSizePreset": "MEDIUM"
                  },
                  "items": [
                    {
                      "bookCode": "KJ",
                      "songNumber": "37",
                      "selectedVerses": ["1"],
                      "refrainMode": "NONE",
                      "order": 1
                    }
                  ]
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/song-exports/multiple")
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andReturn();

        String exportId = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(get("/api/exports/{exportId}/download", exportId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("filename=\"ibadah-minggu.pptx\"")));
    }

    @Test
    void createMultipleSongsExportFailsOnEmptyFileName() throws Exception {
        String requestBody = """
                {
                  "fileName": "",
                  "outputFormat": "PPTX",
                  "layout": { "theme": "LIGHT", "showNotation": true, "slideSize": "LAYOUT_WIDE", "textSizePreset": "MEDIUM" },
                  "items": [
                    { "bookCode": "KJ", "songNumber": "37", "selectedVerses": ["1"], "refrainMode": "NONE", "order": 1 }
                  ]
                }
                """;
        mockMvc.perform(post("/api/song-exports/multiple").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMultipleSongsExportFailsOnEmptyItems() throws Exception {
        String requestBody = """
                {
                  "fileName": "test",
                  "outputFormat": "PPTX",
                  "layout": { "theme": "LIGHT", "showNotation": true, "slideSize": "LAYOUT_WIDE", "textSizePreset": "MEDIUM" },
                  "items": []
                }
                """;
        mockMvc.perform(post("/api/song-exports/multiple").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMultipleSongsExportFailsOnMissingSong() throws Exception {
        String requestBody = """
                {
                  "fileName": "test",
                  "outputFormat": "PPTX",
                  "layout": { "theme": "LIGHT", "showNotation": true, "slideSize": "LAYOUT_WIDE", "textSizePreset": "MEDIUM" },
                  "items": [
                    { "bookCode": "KJ", "songNumber": "999", "selectedVerses": ["1"], "refrainMode": "NONE", "order": 1 }
                  ]
                }
                """;
        mockMvc.perform(post("/api/song-exports/multiple").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorMessage").value(containsString("Song not found")));
    }

    @Test
    void createMultipleSongsExportFailsOnMissingArrangement() throws Exception {
        arrangement.setIsDefault(false);
        songArrangementRepository.save(arrangement);

        String requestBody = """
                {
                  "fileName": "test",
                  "outputFormat": "PPTX",
                  "layout": { "theme": "LIGHT", "showNotation": true, "slideSize": "LAYOUT_WIDE", "textSizePreset": "MEDIUM" },
                  "items": [
                    { "bookCode": "KJ", "songNumber": "37", "selectedVerses": ["1"], "refrainMode": "NONE", "order": 1 }
                  ]
                }
                """;
        mockMvc.perform(post("/api/song-exports/multiple").contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorMessage").value(containsString("Default arrangement not found")));
    }

    @Test
    void createExportDefaultsMissingTextSizePresetToMediumAndPersistsIt() throws Exception {
        mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequestWithoutTextSizePreset("PNG", "NONE", "[1]")))
                .andExpect(status().isOk());

        assertThat(EXPORT_REQUESTS).hasSize(1);
        JsonNode payload = objectMapper.readTree(EXPORT_REQUESTS.get(0).body());
        assertThat(payload.path("layout").path("textSizePreset").asText()).isEqualTo("MEDIUM");

        List<SongExport> exports = songExportRepository.findAll();
        assertThat(exports).hasSize(1);
        assertThat(exports.get(0).getOptionsJson().path("layout").path("textSizePreset").asText()).isEqualTo("MEDIUM");
    }

    @Test
    void createExportForwardsRequestedTextSizePreset() throws Exception {
        mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequestWithTextSizePreset("PPTX", "NONE", "[1]", "LARGE")))
                .andExpect(status().isOk());

        assertThat(EXPORT_REQUESTS).hasSize(1);
        JsonNode payload = objectMapper.readTree(EXPORT_REQUESTS.get(0).body());
        assertThat(payload.path("layout").path("textSizePreset").asText()).isEqualTo("LARGE");
        assertThat(songExportRepository.findAll().get(0).getOptionsJson().path("layout").path("textSizePreset").asText())
                .isEqualTo("LARGE");
    }

    @Test
    void createPngExportFromTextOnlyVerseAndDownloadStoredZip() throws Exception {
        exportServiceResponse = "zip-output".getBytes(StandardCharsets.UTF_8);

        MvcResult result = mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PNG", "NONE", "[3]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.outputFormat").value("PNG"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.storageKey").value(containsString("/songslide-export.zip")))
                .andReturn();

        assertThat(EXPORT_REQUESTS).hasSize(1);
        assertThat(EXPORT_REQUESTS.get(0).path()).isEqualTo("/export/png");
        JsonNode payload = objectMapper.readTree(EXPORT_REQUESTS.get(0).body());
        assertThat(payload.path("slides")).hasSize(1);
        assertThat(payload.path("slides").get(0).path("subtitle").asText()).isEqualTo("Ayat Tambahan 3");
        assertThat(payload.path("slides").get(0).path("lines").get(0).path("lyric").asText())
                .isEqualTo("Text-only verse 3");

        String exportId = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(get("/api/exports/{exportId}/download", exportId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/zip"))
                .andExpect(header().string("Content-Disposition", containsString("filename=\"KJ 37 - 3.zip\"")))
                .andExpect(content().bytes("zip-output".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void createExportRespectsRefrainModes() throws Exception {
        mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PPTX", "ONCE_AFTER_ALL_VERSES", "[1, 2]")))
                .andExpect(status().isOk());

        JsonNode oncePayload = objectMapper.readTree(EXPORT_REQUESTS.get(0).body());
        assertThat(subtitles(oncePayload)).containsExactly("Ayat 1", "Ayat 2", "Refrein");

        EXPORT_REQUESTS.clear();

        mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PPTX", "AFTER_EACH_VERSE", "[1, 2]")))
                .andExpect(status().isOk());

        JsonNode afterEachPayload = objectMapper.readTree(EXPORT_REQUESTS.get(0).body());
        assertThat(subtitles(afterEachPayload)).containsExactly("Ayat 1", "Refrein", "Ayat 2", "Refrein");
    }

    @Test
    void rejectUnavailableSelectedVerseWithoutCallingExportService() throws Exception {
        mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PPTX", "NONE", "[9]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value("selectedVerses contains unavailable verse: 9"));

        assertThat(EXPORT_REQUESTS).isEmpty();
        assertThat(songExportRepository.findAll()).isEmpty();
    }

    @Test
    void exportServiceFailureReturnsClearBackendErrorAndPersistsFailedMetadata() throws Exception {
        EXPORT_SERVICE_STATUS.set(500);
        exportServiceResponse = "{\"message\":\"renderer failed\"}".getBytes(StandardCharsets.UTF_8);

        mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PPTX", "NONE", "[1]")))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(502))
                .andExpect(jsonPath("$.errorMessage").value(containsString(
                        "Export service failed with status 500"
                )));

        List<SongExport> exports = songExportRepository.findAll();
        assertThat(exports).hasSize(1);
        assertThat(exports.get(0).getStatus()).isEqualTo(SongExportStatus.FAILED);
        assertThat(exports.get(0).getErrorMessage()).contains("renderer failed");
    }

    @Test
    void downloadSanitizesDangerousCharactersFromFilename() throws Exception {
        SongBook book = song.getSongBook();
        book.setCode("KJ / \\ \" * ..");
        songBookRepository.save(book);

        exportServiceResponse = "pptx-output".getBytes(StandardCharsets.UTF_8);

        MvcResult result = mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PPTX", "NONE", "[\"3\", \"1\", \"2\"]")))
                .andExpect(status().isOk())
                .andReturn();

        String exportId = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(get("/api/exports/{exportId}/download", exportId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("filename=\"KJ 37 - 1,2,3.pptx\"")));
    }

    @Test
    void downloadWithBlankMetadataFallsBackToDefaultFilename() throws Exception {
        SongBook book = song.getSongBook();
        book.setCode("");
        songBookRepository.save(book);

        song.setSongNumber("");
        songRepository.save(song);

        exportServiceResponse = "pptx-output".getBytes(StandardCharsets.UTF_8);

        MvcResult result = mockMvc.perform(post("/api/songs/{songId}/exports", song.getId())
                        .contextPath("/api")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exportRequest("PPTX", "NONE", "[\"1\"]")))
                .andExpect(status().isOk())
                .andReturn();

        String exportId = JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(get("/api/exports/{exportId}/download", exportId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("filename=\"songslide-export.pptx\"")));
    }

    private JsonNode sampleContentJson() throws Exception {
        return objectMapper.readTree("""
                {
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
                        },
                        {
                          "lineOrder": 2,
                          "notation": "3 2 1 | 2 3",
                          "lyricsByVerse": {
                            "1": "Tu-han me-ngam-pu-ni-ku",
                            "2": "Ba-wa a-ku kem-ba-li"
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
                        "3": "Text-only verse 3"
                      }
                    }
                  ]
                }
                """);
    }

    private String exportRequest(String outputFormat, String refrainMode, String selectedVersesJson) {
        return exportRequestWithTextSizePreset(outputFormat, refrainMode, selectedVersesJson, "MEDIUM");
    }

    private String exportRequestWithoutTextSizePreset(String outputFormat, String refrainMode, String selectedVersesJson) {
        return """
                {
                  "arrangementId": "%s",
                  "selectedVerses": %s,
                  "refrainMode": "%s",
                  "outputFormat": "%s",
                  "layout": {
                    "theme": "LIGHT",
                    "showNotation": true,
                    "slideSize": "LAYOUT_WIDE"
                  }
                }
                """.formatted(arrangement.getId(), selectedVersesJson, refrainMode, outputFormat);
    }

    private String exportRequestWithTextSizePreset(
            String outputFormat,
            String refrainMode,
            String selectedVersesJson,
            String textSizePreset
    ) {
        return """
                {
                  "arrangementId": "%s",
                  "selectedVerses": %s,
                  "refrainMode": "%s",
                  "outputFormat": "%s",
                  "layout": {
                    "theme": "LIGHT",
                    "showNotation": true,
                    "slideSize": "LAYOUT_WIDE",
                    "textSizePreset": "%s"
                  }
                }
                """.formatted(arrangement.getId(), selectedVersesJson, refrainMode, outputFormat, textSizePreset);
    }

    private List<String> subtitles(JsonNode payload) {
        return objectMapper.convertValue(
                payload.path("slides").findValues("subtitle"),
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
        );
    }

    private static void startExportServer() {
        if (exportServer != null) {
            return;
        }

        try {
            exportServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            exportServer.createContext("/", exchange -> {
                String path = exchange.getRequestURI().getPath();
                byte[] requestBody = exchange.getRequestBody().readAllBytes();
                EXPORT_REQUESTS.add(new RecordedExportRequest(
                        path,
                        new String(requestBody, StandardCharsets.UTF_8)
                ));

                byte[] response = exportServiceResponse;
                exchange.getResponseHeaders().add("Content-Type", path.endsWith("/png")
                        ? "application/zip"
                        : "application/vnd.openxmlformats-officedocument.presentationml.presentation");
                exchange.sendResponseHeaders(EXPORT_SERVICE_STATUS.get(), response.length);
                exchange.getResponseBody().write(response);
                exchange.close();
            });
            exportServer.start();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to start export service test server", exception);
        }
    }

    private record RecordedExportRequest(String path, String body) {
    }
}
