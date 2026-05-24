# Backend

Spring Boot 3.x backend service for the SongSlide MVP.

Current scope:

- Java 17 Spring Boot application scaffold.
- PostgreSQL datasource configuration through environment variables.
- Flyway migration support for the canonical MVP catalog schema.
- Actuator health endpoint support.
- Local filesystem storage root configuration.
- Song book, song, arrangement, source image, and export orchestration APIs.
- Canonical tables: `song_books`, `songs`, `song_arrangements`, `song_source_images`, and `song_exports`.

Responsibilities:

- Own canonical SongSlide data and REST APIs.
- Persist data in PostgreSQL.
- Validate and store `song_arrangements.content_json` as the canonical editable/renderable song content.
- Store uploaded source image metadata.
- Orchestrate PPTX and PNG export requests through the export service.
- Use local filesystem storage for the MVP through a storage abstraction.

## Local Commands

Run tests:

```bash
mvn test
```

Start with local PostgreSQL configuration:

```bash
SPRING_PROFILES_ACTIVE=local \
DATABASE_URL=jdbc:postgresql://localhost:5432/songslide \
POSTGRES_USER=songslide \
POSTGRES_PASSWORD=change-me-local-only \
EXPORT_SERVICE_URL=http://localhost:3002 \
mvn spring-boot:run
```

Use `EXPORT_SERVICE_URL=http://localhost:3001` when the backend runs natively against the Docker Compose export-service container.

Check health after startup:

```bash
curl http://localhost:8080/api/actuator/health
```
