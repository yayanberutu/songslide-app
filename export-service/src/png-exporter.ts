import JSZip from "jszip";
import { chromium } from "playwright";
import type { ExportPayload } from "./schemas";

const PNG_ZIP_MIME_TYPE = "application/zip";

interface ImageSize {
  width: number;
  height: number;
}

interface ThemeColors {
  background: string;
  primaryText: string;
  secondaryText: string;
  notationText: string;
  lyricText: string;
  footerText: string;
}

export { PNG_ZIP_MIME_TYPE };

export async function generatePngZip(payload: ExportPayload): Promise<Buffer> {
  const imageSize = getImageSize(payload);
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
      viewport: imageSize,
      deviceScaleFactor: 1,
      javaScriptEnabled: false,
      reducedMotion: "reduce",
      colorScheme: payload.layout.theme === "DARK" ? "dark" : "light"
    });
    const page = await context.newPage();

    for (const index of payload.slides.keys()) {
      await page.setContent(renderSlideHtml(payload, index, imageSize), {
        waitUntil: "load"
      });

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
        animations: "disabled",
        caret: "hide"
      });

      zip.file(`slide-${String(index + 1).padStart(3, "0")}.png`, screenshot);
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

function renderSlideHtml(payload: ExportPayload, slideIndex: number, imageSize: ImageSize): string {
  const slide = payload.slides[slideIndex];
  const colors = getThemeColors(payload.layout.theme);
  const lineCount = slide.lines.length;
  const notationFontSize = getNotationFontSize(lineCount);
  const lyricFontSize = getLyricFontSize(lineCount);
  const lineGap = lineCount <= 4 ? 26 : lineCount <= 7 ? 18 : 10;
  const detailText = [slide.subtitle, slide.metadata]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" | ");

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
      width: ${imageSize.width}px;
      height: ${imageSize.height}px;
      margin: 0;
      overflow: hidden;
      background: #${colors.background};
      color: #${colors.primaryText};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Aptos", Arial, sans-serif;
    }

    .slide {
      width: ${imageSize.width}px;
      height: ${imageSize.height}px;
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      row-gap: 22px;
      padding: 72px 96px 54px;
      overflow: hidden;
    }

    .title {
      max-height: 128px;
      overflow: hidden;
      color: #${colors.primaryText};
      font-size: 58px;
      font-weight: 760;
      line-height: 1.08;
      overflow-wrap: anywhere;
    }

    .details {
      min-height: 36px;
      max-height: 46px;
      overflow: hidden;
      color: #${colors.secondaryText};
      font-size: 30px;
      line-height: 1.18;
      overflow-wrap: anywhere;
    }

    .lines {
      min-height: 0;
      display: grid;
      grid-template-rows: repeat(${lineCount}, minmax(0, 1fr));
      row-gap: ${lineGap}px;
      overflow: hidden;
    }

    .line {
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 9px;
      overflow: hidden;
    }

    .notation,
    .lyric {
      display: block;
      overflow: hidden;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      text-wrap: pretty;
    }

    .notation {
      color: #${colors.notationText};
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: ${notationFontSize}px;
      font-weight: 760;
      line-height: 1.12;
      max-height: ${Math.ceil(notationFontSize * 2.4)}px;
    }

    .lyric {
      color: #${colors.lyricText};
      font-size: ${lyricFontSize}px;
      font-weight: 430;
      line-height: 1.16;
      max-height: ${Math.ceil(lyricFontSize * 2.45)}px;
    }

    .footer {
      height: 24px;
      color: #${colors.footerText};
      font-size: 18px;
      line-height: 24px;
      text-align: right;
    }
  </style>
</head>
<body>
  <main class="slide">
    <section>
      <div class="title">${escapeHtml(slide.title)}</div>
      <div class="details">${escapeHtml(detailText)}</div>
    </section>
    <div aria-hidden="true"></div>
    <section class="lines">
      ${slide.lines.map((line) => renderLineHtml(payload, line)).join("")}
    </section>
    <footer class="footer">${slideIndex + 1} / ${payload.slides.length}</footer>
  </main>
</body>
</html>`;
}

function renderLineHtml(payload: ExportPayload, line: ExportPayload["slides"][number]["lines"][number]): string {
  const notationHtml = payload.layout.showNotation && line.notation
    ? `<div class="notation">${escapeHtml(line.notation)}</div>`
    : "";
  const lyricHtml = line.lyric ? `<div class="lyric">${escapeHtml(line.lyric)}</div>` : "";

  return `<article class="line">${notationHtml}${lyricHtml}</article>`;
}

function getImageSize(payload: ExportPayload): ImageSize {
  if (payload.output?.imageWidth && payload.output.imageHeight) {
    return {
      width: payload.output.imageWidth,
      height: payload.output.imageHeight
    };
  }

  if (payload.layout.slideSize === "LAYOUT_4X3" || payload.layout.slideSize === "4:3") {
    return {
      width: 1440,
      height: 1080
    };
  }

  return {
    width: 1920,
    height: 1080
  };
}

function getThemeColors(theme: ExportPayload["layout"]["theme"]): ThemeColors {
  if (theme === "DARK") {
    return {
      background: "101827",
      primaryText: "F8FAFC",
      secondaryText: "CBD5E1",
      notationText: "FDE68A",
      lyricText: "F8FAFC",
      footerText: "94A3B8"
    };
  }

  return {
    background: "FFFFFF",
    primaryText: "111827",
    secondaryText: "475569",
    notationText: "1F2937",
    lyricText: "111827",
    footerText: "64748B"
  };
}

function getNotationFontSize(lineCount: number): number {
  if (lineCount <= 4) {
    return 46;
  }
  if (lineCount <= 7) {
    return 38;
  }
  return 30;
}

function getLyricFontSize(lineCount: number): number {
  if (lineCount <= 4) {
    return 40;
  }
  if (lineCount <= 7) {
    return 34;
  }
  return 27;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
