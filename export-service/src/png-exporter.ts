import JSZip from "jszip";
import { chromium } from "playwright";
import {
  buildExportRenderPlan,
  getSlideSurfaceSize,
  layoutLinePositions,
  type PlannedExportLine
} from "./export-layout";
import type { ExportPayload } from "./schemas";

const PNG_ZIP_MIME_TYPE = "application/zip";

interface ThemeColors {
  background: string;
  primaryText: string;
  secondaryText: string;
  lyricText: string;
  footerText: string;
}

export { PNG_ZIP_MIME_TYPE };

export async function generatePngZip(payload: ExportPayload): Promise<Buffer> {
  const surface = getSlideSurfaceSize(payload);
  const renderPlan = buildExportRenderPlan(payload, surface);
  const zip = new JSZip();
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-background-networking",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-sync",
      "--no-first-run"
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: surface,
      deviceScaleFactor: 1,
      javaScriptEnabled: false,
      reducedMotion: "reduce",
      colorScheme: payload.layout.theme === "DARK" ? "dark" : "light"
    });
    const page = await context.newPage();

    for (const [pageIndex, slidePage] of renderPlan.pages.entries()) {
      await page.setContent(renderSlideHtml(slidePage, pageIndex, renderPlan, payload.layout.theme), {
        waitUntil: "load"
      });

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
        animations: "disabled",
        caret: "hide"
      });

      zip.file(`slide-${String(pageIndex + 1).padStart(3, "0")}.png`, screenshot);
    }

    await context.close();
  } finally {
    await browser.close();
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6
    }
  });
}

export function buildPngZipFileName(payload: ExportPayload): string {
  const requestedFileName = payload.output?.fileName?.trim();
  const sourceName = requestedFileName || payload.slides[0]?.title || "songslide-export";
  const sanitized = sourceName
    .replace(/[\\/:"*?<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim() || "songslide-export";
  const withoutKnownExtension = sanitized.replace(/\.(pptx|png|zip)$/i, "");

  return `${withoutKnownExtension}.zip`;
}

function renderSlideHtml(
  slidePage: ReturnType<typeof buildExportRenderPlan>["pages"][number],
  pageIndex: number,
  renderPlan: ReturnType<typeof buildExportRenderPlan>,
  theme: ExportPayload["layout"]["theme"]
): string {
  const colors = getThemeColors(theme);
  const { frame, tokens } = renderPlan;
  const linePositions = layoutLinePositions(slidePage.lines, frame.bodyTop, tokens.bodyGap, frame.bodyHeight);
  const subtitleY = frame.headerTop + tokens.titleLineHeight + tokens.titleGap;
  const metadataY = subtitleY + tokens.subtitleLineHeight + tokens.subtitleGap;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: ${frame.surface.width}px;
      height: ${frame.surface.height}px;
      margin: 0;
      overflow: hidden;
      background: #${colors.background};
      color: #${colors.primaryText};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Aptos", Arial, sans-serif;
    }

    .slide {
      position: relative;
      width: ${frame.surface.width}px;
      height: ${frame.surface.height}px;
      overflow: hidden;
    }

    .title {
      position: absolute;
      top: ${frame.headerTop}px;
      left: ${frame.contentX}px;
      width: ${frame.contentWidth}px;
      max-height: ${tokens.titleLineHeight * 2}px;
      overflow: hidden;
      color: #${colors.primaryText};
      font-size: ${tokens.titleFontSize}px;
      font-weight: 760;
      line-height: ${tokens.titleLineHeight}px;
      overflow-wrap: anywhere;
    }

    .subtitle {
      position: absolute;
      top: ${subtitleY}px;
      left: ${frame.contentX}px;
      width: ${frame.contentWidth}px;
      max-height: ${tokens.subtitleLineHeight * 2}px;
      overflow: hidden;
      color: #${colors.primaryText};
      font-size: ${tokens.subtitleFontSize}px;
      font-weight: 760;
      line-height: ${tokens.subtitleLineHeight}px;
      overflow-wrap: anywhere;
    }

    .metadata {
      position: absolute;
      top: ${metadataY}px;
      left: ${frame.contentX}px;
      width: ${frame.contentWidth}px;
      max-height: ${tokens.metadataLineHeight * 2}px;
      overflow: hidden;
      color: #${colors.secondaryText};
      font-size: ${tokens.metadataFontSize}px;
      line-height: ${tokens.metadataLineHeight}px;
      overflow-wrap: anywhere;
    }

    .divider {
      position: absolute;
      top: ${frame.dividerY}px;
      left: ${frame.contentX}px;
      width: ${frame.contentWidth}px;
      height: ${tokens.dividerThickness}px;
      background: #${colors.primaryText}26;
    }

    .line {
      position: absolute;
      left: ${frame.contentX}px;
      width: ${frame.contentWidth}px;
      display: flex;
      align-items: flex-start;
      overflow: hidden;
    }

    .notation-frame,
    .lyric-frame {
      display: block;
      overflow: hidden;
    }

    .notation-frame svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .lyric-frame {
      color: #${colors.lyricText};
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      text-wrap: pretty;
      font-weight: 430;
    }

    .footer {
      position: absolute;
      top: ${frame.footerY}px;
      right: ${frame.contentX}px;
      width: 96px;
      height: ${tokens.footerHeight}px;
      color: #${colors.footerText};
      font-size: ${tokens.footerFontSize}px;
      line-height: ${tokens.footerHeight}px;
      text-align: right;
    }
  </style>
</head>
<body>
  <main class="slide">
    <div class="title">${escapeHtml(slidePage.title)}</div>
    <div class="subtitle">${escapeHtml(slidePage.subtitle)}</div>
    ${slidePage.metadata ? `<div class="metadata">${escapeHtml(slidePage.metadata)}</div>` : ""}
    <div aria-hidden="true" class="divider"></div>
    ${linePositions.map(({ line, y }) => renderLineHtml(line, y, frame.contentWidth)).join("")}
    <footer class="footer">${pageIndex + 1} / ${renderPlan.pages.length}</footer>
  </main>
</body>
</html>`;
}

function renderLineHtml(
  line: PlannedExportLine,
  y: number,
  contentWidth: number
): string {
  if (line.kind === "notation") {
    return `<article class="line" style="top:${y}px;height:${line.displayHeight}px;justify-content:flex-start;">
      <div class="notation-frame" style="width:${Math.min(line.displayWidth, contentWidth)}px;height:${line.displayHeight}px;">${line.svg}</div>
    </article>`;
  }

  return `<article class="line" style="top:${y}px;height:${line.displayHeight}px;">
    <div class="lyric-frame" style="width:${contentWidth}px;height:${line.displayHeight}px;font-size:${line.fontSize}px;line-height:${line.lineHeight}px;">${escapeHtml(line.text)}</div>
  </article>`;
}

function getThemeColors(theme: ExportPayload["layout"]["theme"]): ThemeColors {
  if (theme === "DARK") {
    return {
      background: "101827",
      primaryText: "F8FAFC",
      secondaryText: "CBD5E1",
      lyricText: "F8FAFC",
      footerText: "94A3B8"
    };
  }

  return {
    background: "FFFFFF",
    primaryText: "111827",
    secondaryText: "475569",
    lyricText: "111827",
    footerText: "64748B"
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
