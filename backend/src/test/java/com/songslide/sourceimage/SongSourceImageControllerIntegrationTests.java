package com.songslide.sourceimage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.songslide.arrangement.SongArrangementRepository;
import com.songslide.exporting.SongExportRepository;
import com.songslide.song.Song;
import com.songslide.song.SongRepository;
import com.songslide.songbook.SongBook;
import com.songslide.songbook.SongBookRepository;
import com.songslide.storage.BinaryStorageService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.util.FileSystemUtils;

@ActiveProfiles("test")
@AutoConfigureMockMvc
@SpringBootTest(properties = "songslide.source-images.max-size-mb=1")
class SongSourceImageControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SongSourceImageRepository sourceImageRepository;

    @Autowired
    private SongExportRepository songExportRepository;

    @Autowired
    private SongArrangementRepository songArrangementRepository;

    @Autowired
    private SongRepository songRepository;

    @Autowired
    private SongBookRepository songBookRepository;

    @Autowired
    private BinaryStorageService storageService;

    private Song song;

    @BeforeEach
    void setUp() {
        cleanDatabase();

        SongBook songBook = new SongBook();
        songBook.setCode("BE");
        songBook.setName("Buku Ende");
        songBook.setDisplayOrder(1);
        songBook.setActive(true);
        SongBook savedBook = songBookRepository.save(songBook);

        Song newSong = new Song();
        newSong.setSongBook(savedBook);
        newSong.setSongNumber("12");
        newSong.setTitle("Sai Anju Ma Au");
        song = songRepository.save(newSong);
    }

    @AfterEach
    void tearDown() throws Exception {
        cleanDatabase();
        FileSystemUtils.deleteRecursively(Path.of("target/test-storage"));
    }

    @Test
    void uploadPngListMetadataAndRetrieveContent() throws Exception {
        byte[] image = imageBytes("png");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "source.png",
                MediaType.IMAGE_PNG_VALUE,
                image
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/songs/{songId}/source-images", song.getId())
                        .file(file)
                        .param("pageNumber", "2")
                        .contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.errorMessage").value(nullValue()))
                .andExpect(jsonPath("$.data.songId").value(song.getId().toString()))
                .andExpect(jsonPath("$.data.originalFilename").value("source.png"))
                .andExpect(jsonPath("$.data.contentType").value(MediaType.IMAGE_PNG_VALUE))
                .andExpect(jsonPath("$.data.sizeBytes").value(image.length))
                .andExpect(jsonPath("$.data.pageNumber").value(2))
                .andExpect(jsonPath("$.data.widthPx").value(2))
                .andExpect(jsonPath("$.data.heightPx").value(1))
                .andExpect(jsonPath("$.data.contentUrl").value(containsString("/api/source-images/")))
                .andReturn();

        String sourceImageId = JsonPath.read(uploadResult.getResponse().getContentAsString(), "$.data.id");
        String storageKey = JsonPath.read(uploadResult.getResponse().getContentAsString(), "$.data.storageKey");
        assertThat(sourceImageRepository.findAll()).hasSize(1);
        assertThat(storageKey).startsWith("source-images/" + song.getId() + "/");
        assertThat(storageService.exists(storageKey)).isTrue();

        mockMvc.perform(get("/api/songs/{songId}/source-images", song.getId()).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(sourceImageId))
                .andExpect(jsonPath("$.data[0].contentUrl").value("/api/source-images/" + sourceImageId + "/content"));

        mockMvc.perform(get("/api/source-images/{sourceImageId}/content", sourceImageId).contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE))
                .andExpect(header().string("Content-Disposition", containsString("source.png")))
                .andExpect(content().bytes(image));
    }

    @Test
    void uploadJpeg() throws Exception {
        byte[] image = imageBytes("jpg");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "source.jpeg",
                MediaType.IMAGE_JPEG_VALUE,
                image
        );

        mockMvc.perform(multipart("/api/songs/{songId}/source-images", song.getId())
                        .file(file)
                        .contextPath("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.originalFilename").value("source.jpeg"))
                .andExpect(jsonPath("$.data.contentType").value(MediaType.IMAGE_JPEG_VALUE))
                .andExpect(jsonPath("$.data.widthPx").value(2))
                .andExpect(jsonPath("$.data.heightPx").value(1));
    }

    @Test
    void rejectInvalidContentTypeExtensionOversizedFileAndMissingSong() throws Exception {
        MockMultipartFile textFile = new MockMultipartFile(
                "file",
                "notes.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "not an image".getBytes()
        );

        mockMvc.perform(multipart("/api/songs/{songId}/source-images", song.getId())
                        .file(textFile)
                        .contextPath("/api"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.errorMessage").value("contentType must be image/png or image/jpeg"));

        MockMultipartFile wrongExtension = new MockMultipartFile(
                "file",
                "source.gif",
                MediaType.IMAGE_PNG_VALUE,
                imageBytes("png")
        );

        mockMvc.perform(multipart("/api/songs/{songId}/source-images", song.getId())
                        .file(wrongExtension)
                        .contextPath("/api"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorMessage").value("file extension must be png, jpg, or jpeg"));

        MockMultipartFile oversized = new MockMultipartFile(
                "file",
                "large.png",
                MediaType.IMAGE_PNG_VALUE,
                new byte[(1024 * 1024) + 1]
        );

        mockMvc.perform(multipart("/api/songs/{songId}/source-images", song.getId())
                        .file(oversized)
                        .contextPath("/api"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorMessage").value("file size must be 1 MB or smaller"));

        MockMultipartFile validImage = new MockMultipartFile(
                "file",
                "source.png",
                MediaType.IMAGE_PNG_VALUE,
                imageBytes("png")
        );

        UUID missingSongId = UUID.randomUUID();
        mockMvc.perform(multipart("/api/songs/{songId}/source-images", missingSongId)
                        .file(validImage)
                        .contextPath("/api"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.errorMessage").value("Song not found: " + missingSongId));
    }

    private void cleanDatabase() {
        sourceImageRepository.deleteAll();
        songExportRepository.deleteAll();
        songArrangementRepository.deleteAll();
        songRepository.deleteAll();
        songBookRepository.deleteAll();
    }

    private byte[] imageBytes(String format) throws Exception {
        BufferedImage image = new BufferedImage(2, 1, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, format, output);
        return output.toByteArray();
    }
}
