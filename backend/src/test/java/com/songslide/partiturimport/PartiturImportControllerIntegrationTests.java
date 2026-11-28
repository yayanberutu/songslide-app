package com.songslide.partiturimport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
import com.songslide.songbook.SongBook;
import com.songslide.songbook.SongBookRepository;
import com.songslide.storage.BinaryStorageService;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.util.FileSystemUtils;

@ActiveProfiles("test")
@AutoConfigureMockMvc
@SpringBootTest
class PartiturImportControllerIntegrationTests {

    private static HttpServer ocrServer;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SongRepository songRepository;

    @Autowired
    private SongBookRepository songBookRepository;

    @Autowired
    private BinaryStorageService storageService;

    private Song song;

    @BeforeAll
    static void startOcrServer() throws IOException {
        ocrServer = HttpServer.create(new InetSocketAddress(0), 0);
        ocrServer.createContext("/omr/staff-notation", exchange -> {
            String response = """
                    {
                      "status": "SUCCESS",
                      "detectedKeySignature": "C major",
                      "detectedTimeSignature": "4/4",
                      "noteCount": 4,
                      "measureCount": 1,
                      "lines": ["| 1 2 3 4 ||"],
                      "rawNotation": "| 1 2 3 4 ||",
                      "warnings": ["Hasil konversi otomatis dari OMR perlu dicek manual sebelum disimpan."]
                    }
                    """;
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        ocrServer.start();
    }

    @AfterAll
    static void stopOcrServer() {
        if (ocrServer != null) {
            ocrServer.stop(0);
        }
    }

    @DynamicPropertySource
    static void registerOcrUrl(DynamicPropertyRegistry registry) {
        registry.add("songslide.ocr-service.url", () -> "http://localhost:" + ocrServer.getAddress().getPort());
    }

    @BeforeEach
    void setUp() {
        songRepository.deleteAll();
        songBookRepository.deleteAll();

        SongBook book = new SongBook();
        book.setCode("BE");
        book.setName("Buku Ende");
        book.setDisplayOrder(1);
        book.setActive(true);
        songBookRepository.save(book);

        Song newSong = new Song();
        newSong.setSongBook(book);
        newSong.setSongNumber("1");
        newSong.setTitle("Batu Tikki");
        song = songRepository.save(newSong);
    }

    @AfterEach
    void cleanUp() {
        songRepository.deleteAll();
        songBookRepository.deleteAll();
        FileSystemUtils.deleteRecursively(Path.of("./.local-storage").toFile());
    }

    @Test
    void importPartitur_success_savesFileAndReturnsDraft() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "partitur.png",
                MediaType.IMAGE_PNG_VALUE,
                "fake-png-bytes".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/songs/{songId}/partitur-import", song.getId())
                        .file(file)
                        .contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.originalFilename").value("partitur.png"))
                .andExpect(jsonPath("$.data.detectedKeySignature").value("C major"))
                .andExpect(jsonPath("$.data.detectedTimeSignature").value("4/4"))
                .andExpect(jsonPath("$.data.lines[0]").value("| 1 2 3 4 ||"))
                .andExpect(jsonPath("$.data.warnings[0]").value("Hasil konversi otomatis dari OMR perlu dicek manual sebelum disimpan."));
    }

    @Test
    void importPartitur_songNotFound_returns404() throws Exception {
        UUID unknownId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "partitur.png",
                MediaType.IMAGE_PNG_VALUE,
                "fake-bytes".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/songs/{songId}/partitur-import", unknownId)
                        .file(file)
                        .contextPath("/api"))
                .andExpect(status().isNotFound());
    }

    @Test
    void importPartitur_invalidExtension_returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "bad.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "text-content".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/songs/{songId}/partitur-import", song.getId())
                        .file(file)
                        .contextPath("/api"))
                .andExpect(status().isBadRequest());
    }
}
