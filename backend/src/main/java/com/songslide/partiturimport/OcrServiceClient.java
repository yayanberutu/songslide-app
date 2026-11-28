package com.songslide.partiturimport;

import com.songslide.config.OcrServiceProperties;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class OcrServiceClient {

    private final RestClient restClient;

    public OcrServiceClient(OcrServiceProperties properties, RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl(properties.url())
                .build();
    }

    public PartiturOmrResult extractStaffNotation(byte[] fileBytes, String originalFilename) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return originalFilename;
                }
            };
            body.add("file", fileResource);

            PartiturOmrResult result = restClient.post()
                    .uri("/omr/staff-notation")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(PartiturOmrResult.class);

            if (result == null) {
                throw new PartiturImportException("Layanan OCR/OMR mengembalikan respons kosong.");
            }
            return result;
        } catch (RestClientResponseException exception) {
            String responseBody = exception.getResponseBodyAsString(StandardCharsets.UTF_8);
            String detail = (responseBody == null || responseBody.isBlank())
                    ? exception.getStatusText()
                    : responseBody;
            throw new PartiturImportException("Layanan OMR gagal: " + detail, exception);
        } catch (ResourceAccessException exception) {
            throw new PartiturImportException("Layanan OMR tidak dapat dihubungi: " + exception.getMessage(), exception);
        }
    }
}
