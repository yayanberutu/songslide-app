# Backend

Spring Boot 3.x backend service for the SongSlide MVP.

Current scope:

- Java 17 Spring Boot application scaffold.
- PostgreSQL datasource configuration through environment variables.
- Flyway migration support with migrations intentionally deferred to issue #4.
- Actuator health endpoint support.
- Local filesystem storage root configuration.
- Basic startup/context test.

Planned responsibilities:

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
mvn spring-boot:run
```

Check health after startup:

```bash
curl http://localhost:8080/api/actuator/health
```
