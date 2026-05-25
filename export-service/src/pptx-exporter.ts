import pptxgen from "pptxgenjs";
import { buildNotationSvgDataUri, createNotationTheme } from "./notation-renderer";
import type { ExportPayload } from "./schemas";

const PPTX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

interface SlideSize {
  pptxLayout: string;
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

export { PPTX_MIME_TYPE };

export async function generatePptx(payload: ExportPayload): Promise<Buffer> {
  const pptx = new pptxgen();
  const slideSize = getSlideSize(payload.layout.slideSize);
  pptx.layout = slideSize.pptxLayout;
  pptx.author = "SongSlide";
  pptx.company = "SongSlide";
  pptx.subject = "Church song numbered notation export";
  pptx.title = payload.slides[0]?.title ?? "SongSlide export";
  pptx.theme = {
    headFontFace: "Aptos",
    bodyFontFace: "Aptos"
  };

  payload.slides.forEach((slidePayload, slideIndex) => {
    const slide = pptx.addSlide();
    const colors = getThemeColors(payload.layout.theme);
    slide.background = { color: colors.background };

    slide.addText(slidePayload.title, {
      x: 0.55,
      y: 0.32,
      w: slideSize.width - 1.1,
      h: 0.42,
      margin: 0,
      fontFace: "Aptos Display",
      fontSize: 23,
      bold: true,
      color: colors.primaryText,
      fit: "shrink"
    });

    const detailText = [slidePayload.subtitle, slidePayload.metadata]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(" | ");

    if (detailText) {
      slide.addText(detailText, {
        x: 0.56,
        y: 0.82,
        w: slideSize.width - 1.12,
        h: 0.27,
        margin: 0,
        fontFace: "Aptos",
        fontSize: 11.5,
        color: colors.secondaryText,
        fit: "shrink"
      });
    }

    const bodyX = 0.72;
    const bodyY = 1.36;
    const bodyW = slideSize.width - 1.44;
    const footerH = 0.34;
    const bodyH = slideSize.height - bodyY - footerH - 0.24;
    const lines = slidePayload.lines;
    const blockH = Math.min(0.86, Math.max(0.46, bodyH / Math.max(lines.length, 1)));
    const lyricFontSize = getLyricFontSize(lines.length);
    const notationTheme = createNotationTheme(payload.layout.theme);

    lines.forEach((line, lineIndex) => {
      const y = bodyY + lineIndex * blockH;
      const hasNotation = payload.layout.showNotation && Boolean(line.notation);
      const hasLyric = Boolean(line.lyric);

      if (hasNotation && line.notation) {
        slide.addImage({
          x: bodyX,
          y,
          w: bodyW,
          h: hasLyric ? blockH * 0.84 : blockH * 0.58,
          data: buildNotationSvgDataUri({
            notation: line.notation,
            lyric: hasLyric ? line.lyric : null,
            theme: notationTheme
          }),
          altText: "Numbered notation export"
        });
      }

      if (!hasNotation && hasLyric && line.lyric) {
        slide.addText(line.lyric, {
          x: bodyX,
          y: y + blockH * 0.08,
          w: bodyW,
          h: blockH * 0.64,
          margin: 0,
          fontFace: "Aptos",
          fontSize: lyricFontSize,
          color: colors.lyricText,
          fit: "shrink"
        });
      }
    });

    slide.addText(`${slideIndex + 1} / ${payload.slides.length}`, {
      x: slideSize.width - 1.1,
      y: slideSize.height - 0.38,
      w: 0.55,
      h: 0.18,
      margin: 0,
      fontFace: "Aptos",
      fontSize: 8,
      color: colors.footerText,
      align: "right"
    });
  });

  const output = await pptx.write({ outputType: "nodebuffer", compression: true });
  return toBuffer(output);
}

export function buildPptxFileName(payload: ExportPayload): string {
  const requestedFileName = payload.output?.fileName?.trim();
  const sourceName = requestedFileName || payload.slides[0]?.title || "songslide-export";
  const sanitized = sourceName
    .replace(/[\\/:"*?<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim() || "songslide-export";

  return sanitized.toLowerCase().endsWith(".pptx") ? sanitized : `${sanitized}.pptx`;
}

function getSlideSize(slideSize: ExportPayload["layout"]["slideSize"]): SlideSize {
  if (slideSize === "LAYOUT_4X3" || slideSize === "4:3") {
    return {
      pptxLayout: "LAYOUT_4x3",
      width: 10,
      height: 7.5
    };
  }

  return {
    pptxLayout: "LAYOUT_WIDE",
    width: 13.333,
    height: 7.5
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

function getLyricFontSize(lineCount: number): number {
  if (lineCount <= 4) {
    return 18;
  }
  if (lineCount <= 7) {
    return 15;
  }
  return 12;
}

function toBuffer(output: string | ArrayBuffer | Blob | Uint8Array): Buffer {
  if (Buffer.isBuffer(output)) {
    return output;
  }
  if (output instanceof ArrayBuffer) {
    return Buffer.from(output);
  }
  if (ArrayBuffer.isView(output)) {
    return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
  }
  if (typeof output === "string") {
    return Buffer.from(output, "binary");
  }

  throw new Error("Unsupported PPTX output type");
}
