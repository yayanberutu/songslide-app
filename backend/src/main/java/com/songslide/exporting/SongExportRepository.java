package com.songslide.exporting;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SongExportRepository extends JpaRepository<SongExport, UUID> {
}
