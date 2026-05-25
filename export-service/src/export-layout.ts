import {
  createNotationTheme,
  renderNotationLineSvg,
  type RenderTheme,
  type RenderedLine
} from "./notation-renderer";
import type { ExportPayload } from "./schemas";

type SlidePayload = ExportPayload["slides"][number];
type SlideLinePayload = SlidePayload["lines"][number];

const BASE_SURFACE_WIDTH = 1920;
const BASE_SURFACE_HEIGHT = 1080;
const TEXT_WIDTH_FACTOR = 0.56;

export type ExportSurfaceSize = {
  width: number;
  height: number;
};

export type ExportLayoutTokens = {
  outerPaddingX: number;
  outerPaddingTop: number;
  outerPaddingBottom: number;
  titleFontSize: number;
  titleLineHeight: number;
  titleGap: number;
  subtitleFontSize: number;
  subtitleLineHeight: number;
  subtitleGap: number;
  metadataFontSize: number;
  metadataLineHeight: number;
  dividerGapTop: number;
  dividerGapBottom: number;
  dividerThickness: number;
  bodyGap: number;
  lyricOnlyFontSize: number;
  lyricOnlyLineHeight: number;
  notationScale: number;
  footerFontSize: number;
  footerHeight: number;
};

export type ExportLayoutFrame = {
  surface: ExportSurfaceSize;
  contentX: number;
  contentWidth: number;
  headerTop: number;
  bodyTop: number;
  bodyHeight: number;
  dividerY: number;
  footerY: number;
};

type PlannedNotationLine = {
  kind: "notation";
  svg: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  hasLyric: boolean;
};

type PlannedLyricLine = {
  kind: "lyric";
  text: string;
  fontSize: number;
  lineHeight: number;
  estimatedLineCount: number;
  displayHeight: number;
};

export type PlannedExportLine = PlannedNotationLine | PlannedLyricLine;

export type PlannedExportPage = {
  sourceSlideIndex: number;
  title: string;
  subtitle: string;
  metadata: string | null;
  lines: PlannedExportLine[];
};

export type ExportRenderPlan = {
  frame: ExportLayoutFrame;
  tokens: ExportLayoutTokens;
  pages: PlannedExportPage[];
};

export function buildExportRenderPlan(
  payload: ExportPayload,
  surface: ExportSurfaceSize
): ExportRenderPlan {
  const tokens = createLayoutTokens(surface);
  const notationTheme = createNotationTheme(payload.layout.theme);
  const contentX = tokens.outerPaddingX;
  const contentWidth = surface.width - tokens.outerPaddingX * 2;

  const pages: PlannedExportPage[] = [];
  let frame: ExportLayoutFrame | null = null;

  payload.slides.forEach((slide, slideIndex) => {
    const headerLayout = measureHeaderLayout(slide, contentWidth, tokens);
    const bodyTop = tokens.outerPaddingTop + headerLayout.height;
    const footerY = surface.height - tokens.outerPaddingBottom - tokens.footerHeight;
    const bodyHeight = Math.max(0, footerY - bodyTop);
    const slideFrame: ExportLayoutFrame = {
      surface,
      contentX,
      contentWidth,
      headerTop: tokens.outerPaddingTop,
      bodyTop,
      bodyHeight,
      dividerY: headerLayout.dividerY,
      footerY
    };
    frame ??= slideFrame;

    const visibleLines = collectVisibleLines(slide.lines, payload.layout.showNotation);
    const plannedLines = visibleLines.map((line) => planVisibleLine(line, contentWidth, tokens, notationTheme));
    const pagedLines = paginateLines(plannedLines, bodyHeight, tokens.bodyGap);

    if (pagedLines.length === 0) {
      pages.push({
        sourceSlideIndex: slideIndex,
        title: slide.title,
        subtitle: slide.subtitle ?? "",
        metadata: slide.metadata ?? null,
        lines: []
      });
      return;
    }

    pagedLines.forEach((lines) => {
      pages.push({
        sourceSlideIndex: slideIndex,
        title: slide.title,
        subtitle: slide.subtitle ?? "",
        metadata: slide.metadata ?? null,
        lines
      });
    });
  });

  return {
    frame: frame ?? {
      surface,
      contentX,
      contentWidth,
      headerTop: tokens.outerPaddingTop,
      bodyTop: tokens.outerPaddingTop,
      bodyHeight: surface.height - tokens.outerPaddingTop - tokens.outerPaddingBottom - tokens.footerHeight,
      dividerY: tokens.outerPaddingTop,
      footerY: surface.height - tokens.outerPaddingBottom - tokens.footerHeight
    },
    tokens,
    pages
  };
}

export function createLayoutTokens(surface: ExportSurfaceSize): ExportLayoutTokens {
  const scale = Math.min(surface.width / BASE_SURFACE_WIDTH, surface.height / BASE_SURFACE_HEIGHT);

  return {
    outerPaddingX: scaleValue(96, scale),
    outerPaddingTop: scaleValue(68, scale),
    outerPaddingBottom: scaleValue(52, scale),
    titleFontSize: scaleValue(26, scale),
    titleLineHeight: scaleValue(32, scale),
    titleGap: scaleValue(10, scale),
    subtitleFontSize: scaleValue(54, scale),
    subtitleLineHeight: scaleValue(62, scale),
    subtitleGap: scaleValue(10, scale),
    metadataFontSize: scaleValue(24, scale),
    metadataLineHeight: scaleValue(30, scale),
    dividerGapTop: scaleValue(18, scale),
    dividerGapBottom: scaleValue(24, scale),
    dividerThickness: Math.max(1, scaleValue(2, scale)),
    bodyGap: scaleValue(18, scale),
    lyricOnlyFontSize: scaleValue(38, scale),
    lyricOnlyLineHeight: scaleValue(48, scale),
    notationScale: 1.24 * scale,
    footerFontSize: scaleValue(18, scale),
    footerHeight: scaleValue(24, scale)
  };
}

export function layoutLinePositions(
  lines: readonly PlannedExportLine[],
  bodyTop: number,
  gap: number
): Array<{ line: PlannedExportLine; y: number }> {
  let cursorY = bodyTop;

  return lines.map((line, index) => {
    const positioned = { line, y: cursorY };
    cursorY += line.displayHeight;
    if (index < lines.length - 1) {
      cursorY += gap;
    }
    return positioned;
  });
}

export function getSlideSurfaceSize(payload: ExportPayload): ExportSurfaceSize {
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

function measureHeaderLayout(
  slide: SlidePayload,
  contentWidth: number,
  tokens: ExportLayoutTokens
) {
  const titleLines = estimateTextLineCount(slide.title, tokens.titleFontSize, contentWidth, 2);
  const subtitleLines = estimateTextLineCount(slide.subtitle ?? "", tokens.subtitleFontSize, contentWidth, 2);
  const metadataLines = hasText(slide.metadata)
    ? estimateTextLineCount(slide.metadata ?? "", tokens.metadataFontSize, contentWidth, 2)
    : 0;
  const titleHeight = titleLines * tokens.titleLineHeight;
  const subtitleHeight = subtitleLines * tokens.subtitleLineHeight;
  const metadataHeight = metadataLines * tokens.metadataLineHeight;
  const dividerY = tokens.outerPaddingTop
    + titleHeight
    + tokens.titleGap
    + subtitleHeight
    + (metadataHeight > 0 ? tokens.subtitleGap + metadataHeight : 0)
    + tokens.dividerGapTop;
  const height = dividerY - tokens.outerPaddingTop + tokens.dividerThickness + tokens.dividerGapBottom;

  return {
    titleHeight,
    subtitleHeight,
    metadataHeight,
    dividerY,
    height
  };
}

function collectVisibleLines(
  lines: readonly SlideLinePayload[],
  showNotation: boolean
): Array<{ notation: string | null; lyric: string | null; useNotation: boolean }> {
  return lines
    .map((line) => ({
      notation: normalizeOptionalText(line.notation),
      lyric: normalizeOptionalText(line.lyric),
      useNotation: showNotation && hasText(line.notation)
    }))
    .filter((line) => (line.useNotation && line.notation !== null) || line.lyric !== null);
}

function planVisibleLine(
  line: { notation: string | null; lyric: string | null; useNotation: boolean },
  contentWidth: number,
  tokens: ExportLayoutTokens,
  notationTheme: RenderTheme
): PlannedExportLine {
  if (line.useNotation && line.notation) {
    const rendered = renderNotationLineSvg({
      notation: line.notation,
      lyric: line.lyric,
      theme: notationTheme
    });
    return planNotationLine(rendered, Boolean(line.lyric), contentWidth, tokens.notationScale);
  }

  const text = line.lyric ?? "";
  const estimatedLineCount = estimateTextLineCount(text, tokens.lyricOnlyFontSize, contentWidth, 4);
  return {
    kind: "lyric",
    text,
    fontSize: tokens.lyricOnlyFontSize,
    lineHeight: tokens.lyricOnlyLineHeight,
    estimatedLineCount,
    displayHeight: estimatedLineCount * tokens.lyricOnlyLineHeight
  };
}

function planNotationLine(
  rendered: RenderedLine,
  hasLyric: boolean,
  contentWidth: number,
  notationScale: number
): PlannedNotationLine {
  const scaledWidth = rendered.width * notationScale;
  const scaledHeight = rendered.height * notationScale;
  const fitRatio = scaledWidth > contentWidth ? contentWidth / scaledWidth : 1;

  return {
    kind: "notation",
    svg: rendered.svg,
    naturalWidth: rendered.width,
    naturalHeight: rendered.height,
    displayWidth: roundLayoutValue(scaledWidth * fitRatio),
    displayHeight: roundLayoutValue(scaledHeight * fitRatio),
    hasLyric
  };
}

function paginateLines(
  lines: readonly PlannedExportLine[],
  bodyHeight: number,
  gap: number
): PlannedExportLine[][] {
  if (lines.length === 0) {
    return [];
  }

  const pages: PlannedExportLine[][] = [];
  let currentPage: PlannedExportLine[] = [];
  let usedHeight = 0;

  lines.forEach((line) => {
    const nextHeight = line.displayHeight + (currentPage.length > 0 ? gap : 0);

    if (currentPage.length > 0 && usedHeight + nextHeight > bodyHeight) {
      pages.push(currentPage);
      currentPage = [line];
      usedHeight = line.displayHeight;
      return;
    }

    currentPage.push(line);
    usedHeight += nextHeight;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function estimateTextLineCount(
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines: number
): number {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return 0;
  }

  const maxCharsPerLine = Math.max(8, Math.floor(maxWidth / (fontSize * TEXT_WIDTH_FACTOR)));
  let lines = 1;
  let currentLineLength = 0;

  for (const word of normalized.split(/\s+/)) {
    const wordLength = Math.max(1, word.length);
    const requiredLength = currentLineLength === 0 ? wordLength : currentLineLength + 1 + wordLength;

    if (requiredLength <= maxCharsPerLine) {
      currentLineLength = requiredLength;
      continue;
    }

    if (currentLineLength > 0) {
      lines += 1;
    }

    currentLineLength = wordLength;

    if (wordLength > maxCharsPerLine) {
      lines += Math.ceil(wordLength / maxCharsPerLine) - 1;
      currentLineLength = wordLength % maxCharsPerLine || maxCharsPerLine;
    }

    if (lines >= maxLines) {
      return maxLines;
    }
  }

  return Math.min(lines, maxLines);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function hasText(value: string | null | undefined): boolean {
  return normalizeOptionalText(value) !== null;
}

function scaleValue(value: number, scale: number) {
  return roundLayoutValue(value * scale);
}

function roundLayoutValue(value: number) {
  return Math.round(value * 100) / 100;
}
