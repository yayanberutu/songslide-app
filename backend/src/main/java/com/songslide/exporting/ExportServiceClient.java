package com.songslide.exporting;

import com.songslide.config.ExportServiceProperties;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class ExportServiceClient {

    private final RestClient restClient;

    public ExportServiceClient(ExportServiceProperties properties, RestClient.Builder restClientBuilder) {
        restClient = restClientBuilder
                .baseUrl(properties.url())
                .build();
    }

    public byte[] export(SongExportFormat format, ExportServicePayload payload) {
        try {
            ResponseEntity<byte[]> response = restClient.post()
                    .uri(format.exportPath())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_OCTET_STREAM)
                    .body(payload)
                    .retrieve()
                    .toEntity(byte[].class);

            byte[] body = response.getBody();
            if (body == null || body.length == 0) {
                throw new ExportServiceException("Export service returned an empty response body");
            }
            return body;
        } catch (RestClientResponseException exception) {
            String body = exception.getResponseBodyAsString(StandardCharsets.UTF_8);
            String detail = body == null || body.isBlank() ? exception.getStatusText() : body;
            throw new ExportServiceException(
                    "Export service failed with status " + exception.getStatusCode().value() + ": " + detail,
                    exception
            );
        } catch (ResourceAccessException exception) {
            throw new ExportServiceException("Export service is unavailable: " + exception.getMessage(), exception);
        }
    }
}
