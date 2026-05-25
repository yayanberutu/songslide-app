import pptxgen from "pptxgenjs";
import {
  buildExportRenderPlan,
  getSlideSurfaceSize,
  layoutLinePositions
} from "./export-layout";
import { buildNotationSvgDataUriFromSvg } from "./notation-renderer";
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
  lyricText: string;
  footerText: string;
}

export { PPTX_MIME_TYPE };

export async function generatePptx(payload: ExportPayload): Promise<Buffer> {
  const pptx = new pptxgen();
  const slideSize = getSlideSize(payload.layout.slideSize);
  const surface = getSlideSurfaceSize(payload);
  const renderPlan = buildExportRenderPlan(payload, surface);
  const pxToInches = slideSize.width / surface.width;
  pptx.layout = slideSize.pptxLayout;
  pptx.author = "SongSlide";
  pptx.company = "SongSlide";
  pptx.subject = "Church song numbered notation export";
  pptx.title = payload.slides[0]?.title ?? "SongSlide export";
  pptx.theme = {
    headFontFace: "Aptos",
    bodyFontFace: "Aptos"
  };

  renderPlan.pages.forEach((slidePage, pageIndex) => {
    const slide = pptx.addSlide();
    const colors = getThemeColors(payload.layout.theme);
    const { frame, tokens } = renderPlan;
    const subtitleY = frame.headerTop + tokens.titleLineHeight + tokens.titleGap;
    const metadataY = subtitleY + tokens.subtitleLineHeight + tokens.subtitleGap;
    const linePositions = layoutLinePositions(slidePage.lines, frame.bodyTop, tokens.bodyGap);

    slide.background = { color: colors.background };

    slide.addText(slidePage.title, {
      x: pxToUnits(frame.contentX, pxToInches),
      y: pxToUnits(frame.headerTop, pxToInches),
      w: pxToUnits(frame.contentWidth, pxToInches),
      h: pxToUnits(tokens.titleLineHeight * 2, pxToInches),
      margin: 0,
      fontFace: "Aptos",
      fontSize: pxToPoints(tokens.titleFontSize),
      bold: true,
      color: colors.primaryText,
      fit: "shrink"
    });

    slide.addText(slidePage.subtitle, {
      x: pxToUnits(frame.contentX, pxToInches),
      y: pxToUnits(subtitleY, pxToInches),
      w: pxToUnits(frame.contentWidth, pxToInches),
      h: pxToUnits(tokens.subtitleLineHeight * 2, pxToInches),
      margin: 0,
      fontFace: "Aptos Display",
      fontSize: pxToPoints(tokens.subtitleFontSize),
      bold: true,
      color: colors.primaryText,
      fit: "shrink"
    });

    if (slidePage.metadata) {
      slide.addText(slidePage.metadata, {
        x: pxToUnits(frame.contentX, pxToInches),
        y: pxToUnits(metadataY, pxToInches),
        w: pxToUnits(frame.contentWidth, pxToInches),
        h: pxToUnits(tokens.metadataLineHeight * 2, pxToInches),
        margin: 0,
        fontFace: "Aptos",
        fontSize: pxToPoints(tokens.metadataFontSize),
        color: colors.secondaryText,
        fit: "shrink"
      });
    }

    slide.addShape(pptx.ShapeType.line, {
      x: pxToUnits(frame.contentX, pxToInches),
      y: pxToUnits(frame.dividerY, pxToInches),
      w: pxToUnits(frame.contentWidth, pxToInches),
      h: 0,
      line: {
        color: colors.primaryText,
        transparency: 75,
        width: Math.max(1, pxToPoints(tokens.dividerThickness))
      }
    });

    linePositions.forEach(({ line, y }) => {
      if (line.kind === "notation") {
        slide.addImage({
          x: pxToUnits(frame.contentX, pxToInches),
          y: pxToUnits(y, pxToInches),
          w: pxToUnits(line.displayWidth, pxToInches),
          h: pxToUnits(line.displayHeight, pxToInches),
          data: buildNotationSvgDataUriFromSvg(line.svg),
          altText: "Numbered notation export"
        });
        return;
      }

      slide.addText(line.text, {
        x: pxToUnits(frame.contentX, pxToInches),
        y: pxToUnits(y, pxToInches),
        w: pxToUnits(frame.contentWidth, pxToInches),
        h: pxToUnits(line.displayHeight, pxToInches),
        margin: 0,
        fontFace: "Aptos",
        fontSize: pxToPoints(line.fontSize),
        color: colors.lyricText,
        fit: "shrink"
      });
    });

    slide.addText(`${pageIndex + 1} / ${renderPlan.pages.length}`, {
      x: pxToUnits(frame.surface.width - frame.contentX - 96, pxToInches),
      y: pxToUnits(frame.footerY, pxToInches),
      w: pxToUnits(96, pxToInches),
      h: pxToUnits(tokens.footerHeight, pxToInches),
      margin: 0,
      fontFace: "Aptos",
      fontSize: pxToPoints(tokens.footerFontSize),
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

function pxToUnits(value: number, pxToInches: number) {
  return Number((value * pxToInches).toFixed(3));
}

function pxToPoints(value: number) {
  return Number((value * 0.75).toFixed(2));
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
