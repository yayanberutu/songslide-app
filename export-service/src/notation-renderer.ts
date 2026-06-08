import type { ExportPayload } from "./schemas";

export type NotationParserIssueCode =
  | "INVALID_TOKEN"
  | "INVALID_NOTE_DEGREE"
  | "UNCLOSED_SLUR_GROUP"
  | "UNCLOSED_BEAM_GROUP"
  | "MISMATCHED_CLOSING";

export type NotationParserIssue = {
  code: NotationParserIssueCode;
  message: string;
  raw: string;
  index: number;
};

type NotationTokenBase = {
  raw: string;
  index: number;
  lyricSlots: number;
  hasFermata?: boolean;
};

export type NotationNoteToken = NotationTokenBase & {
  type: "NOTE";
  accidental?: "#" | "b";
  degree: string;
  octave: number;
  shortDurationLevel: number;
  holdCount: number;
  lyricSlots: 1;
};

export type NotationRestToken = NotationTokenBase & {
  type: "REST";
  lyricSlots: 0;
};

export type NotationBarToken = NotationTokenBase & {
  type: "BAR";
  lyricSlots: 0;
};

export type NotationDoubleBarToken = NotationTokenBase & {
  type: "DOUBLE_BAR";
  lyricSlots: 0;
};

export type NotationExtensionToken = NotationTokenBase & {
  type: "EXTENSION";
  lyricSlots: 0;
};

export type NotationSlurToken = NotationTokenBase & {
  type: "SLUR";
  children: NotationGroupChildToken[];
  lyricSlots: 1;
};

export type NotationBeamToken = NotationTokenBase & {
  type: "BEAM";
  children: NotationGroupChildToken[];
};

export type NotationToken =
  | NotationNoteToken
  | NotationRestToken
  | NotationBarToken
  | NotationDoubleBarToken
  | NotationExtensionToken
  | NotationSlurToken
  | NotationBeamToken;

export type NotationGroupChildToken =
  | NotationNoteToken
  | NotationExtensionToken
  | NotationSlurToken
  | NotationBeamToken;

export type NotationLyricSlotToken = NotationNoteToken | NotationSlurToken;

export type NotationParseResult = {
  tokens: NotationToken[];
  issues: NotationParserIssue[];
};

type ParseSequenceResult = {
  tokens: NotationToken[];
  issues: NotationParserIssue[];
  nextCursor: number;
  closed: boolean;
};

export type RenderTheme = {
  notationText: string;
  lyricText: string;
};

export type RenderMetrics = {
  scale: number;
  noteWidth: number;
  restWidth: number;
  extensionWidth: number;
  barWidth: number;
  tokenGap: number;
  notationHeight: number;
  lyricHeight: number;
  baselineY: number;
  topDotY: number;
  topDotYBeamed: number;
  bottomDotY: number;
  extensionDotY: number;
  fermataY: number;
  beamLevelOneY: number;
  beamLevelTwoY: number;
  slurBaseY: number;
  lyricBaselineY: number;
  noteFontSize: number;
  restFontSize: number;
  lyricFontSize: number;
  lyricHorizontalPadding: number;
  lyricMinGap: number;
  dotRadius: number;
  plainNotationFontSize: number;
};

type RenderedToken = {
  width: number;
  markup: string[];
  slotAnchors: number[];
  firstNoteAnchor: number | null;
};

export type RenderLineOptions = {
  notation: string;
  lyric?: string | null;
  theme: Pick<RenderTheme, "notationText" | "lyricText">;
  metrics?: RenderMetrics;
  targetWidth?: number;
};

export type RenderedLine = {
  svg: string;
  issues: NotationParserIssue[];
  slotAnchors: number[];
  width: number;
  height: number;
  lyricPlacements: LyricPlacement[];
};

export type LyricPlacement = {
  text: string;
  anchorX: number;
  centerX: number;
  width: number;
  left: number;
  right: number;
};

const notePattern = /^([#b]?)([0-9])([',]*)(\/{1,2})?(-{1,2})?$/;
const closingTokenNames: Record<")" | "]", string> = {
  ")": "parenthesis",
  "]": "bracket"
};

export const DEFAULT_RENDER_METRICS = createRenderMetrics();

export function parseNotationLine(input: string | null | undefined): NotationParseResult {
  const source = input?.trim() ?? "";
  if (source.length === 0) {
    return { tokens: [], issues: [] };
  }

  const result = parseSequence(source, 0, null);
  return {
    tokens: result.tokens,
    issues: result.issues
  };
}

export function countGaps(tokens: readonly NotationToken[]): number {
  let gaps = Math.max(0, tokens.length - 1);
  for (const token of tokens) {
    if (token.type === "BEAM" || token.type === "SLUR") {
      gaps += countGaps(token.children);
    }
  }
  return gaps;
}

export function countNotationLyricSlots(tokens: readonly NotationToken[]) {
  return tokens.reduce((total, token) => total + token.lyricSlots, 0);
}

export function collectLyricSlotTokens(tokens: readonly NotationToken[]): NotationLyricSlotToken[] {
  return tokens.flatMap((token) => {
    if (token.type === "NOTE" || token.type === "SLUR") {
      return [token];
    }

    if (token.type === "BEAM") {
      return collectLyricSlotTokens(token.children);
    }

    return [];
  });
}

export function resolveLyricAnchor(token: NotationLyricSlotToken): NotationNoteToken | null {
  if (token.type === "NOTE") {
    return token;
  }

  return findFirstRenderableNote(token.children);
}

export function parseLyricSyllables(input: string | null | undefined): string[] {
  const source = input?.trim() ?? "";
  if (source.length === 0) {
    return [];
  }

  return source
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function createRenderMetrics(scale = 1): RenderMetrics {
  return {
    scale,
    noteWidth: 22 * scale,
    restWidth: 18 * scale,
    extensionWidth: 14 * scale,
    barWidth: 8 * scale,
    tokenGap: 4 * scale,
    notationHeight: 64 * scale,
    lyricHeight: 28 * scale,
    baselineY: 44 * scale,
    topDotY: 24 * scale,
    topDotYBeamed: 24 * scale,
    bottomDotY: 54 * scale,
    extensionDotY: 44 * scale,
    fermataY: 2 * scale,
    beamLevelOneY: 8 * scale,
    beamLevelTwoY: 14 * scale,
    slurBaseY: 58 * scale,
    lyricBaselineY: 83 * scale,
    noteFontSize: 24 * scale,
    restFontSize: 22 * scale,
    lyricFontSize: 22 * scale,
    lyricHorizontalPadding: 0,
    lyricMinGap: 0,
    dotRadius: Math.max(1.2, 1.4 * scale),
    plainNotationFontSize: 22 * scale
  };
}

export function renderNotationLineSvg(options: RenderLineOptions): RenderedLine {
  const metrics = options.metrics ?? DEFAULT_RENDER_METRICS;
  const parsed = parseNotationLine(options.notation);
  if (parsed.issues.length > 0) {
    const fallback = renderPlainNotationSvg(options.notation, options.lyric, options.theme, metrics);
    return {
      svg: fallback.svg,
      issues: parsed.issues,
      slotAnchors: [],
      width: fallback.width,
      height: fallback.height,
      lyricPlacements: []
    };
  }

  const lyricSyllables = parseLyricSyllables(options.lyric);
  const slotTokens = collectLyricSlotTokens(parsed.tokens);
  const syllableMap = new Map<NotationToken, string>();
  
  slotTokens.forEach((token, index) => {
    if (index < lyricSyllables.length) {
      if (token.type === "SLUR") {
        const firstNote = findFirstRenderableNote(token.children);
        if (firstNote) syllableMap.set(firstNote, lyricSyllables[index]);
      } else {
        syllableMap.set(token, lyricSyllables[index]);
      }
    }
  });

  let topLevel = renderTokenSequence(parsed.tokens, 0, 0, options.theme, metrics, syllableMap);
  let actualMetrics = metrics;

  if (options.targetWidth && topLevel.width < options.targetWidth) {
    const gaps = countGaps(parsed.tokens);
    if (gaps > 0) {
      const extraGap = (options.targetWidth - topLevel.width) / gaps;
      actualMetrics = { ...metrics, tokenGap: metrics.tokenGap + extraGap };
      topLevel = renderTokenSequence(parsed.tokens, 0, 0, options.theme, actualMetrics, syllableMap);
    }
  }

  const hasLyric = lyricSyllables.length > 0;
  const height = hasLyric ? actualMetrics.notationHeight + actualMetrics.lyricHeight : actualMetrics.notationHeight;
  const lyricPlacements = hasLyric
    ? resolveLyricPlacements(
        topLevel.slotAnchors,
        lyricSyllables.slice(0, topLevel.slotAnchors.length),
        Math.max(topLevel.width, 1),
        actualMetrics
      )
    : [];
  const width = Math.max(
    Math.ceil(topLevel.width),
    Math.ceil(lyricPlacements.reduce((maxRight, placement) => Math.max(maxRight, placement.right), 0)),
    1
  );

  const lyricMarkup = lyricPlacements
    .map((placement) => renderLyricText(placement.centerX, placement.text, options.theme.lyricText, metrics))
    .join("");

  return {
    svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMid meet" role="img">`,
      `<g>${topLevel.markup.join("")}</g>`,
      lyricMarkup,
      "</svg>"
    ].join(""),
    issues: [],
    slotAnchors: topLevel.slotAnchors,
    width,
    height,
    lyricPlacements
  };
}

function parseSequence(source: string, cursor: number, stopChar: ")" | "]" | null): ParseSequenceResult {
  const tokens: NotationToken[] = [];
  const issues: NotationParserIssue[] = [];

  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor += 1;
      continue;
    }

    if (stopChar !== null && source[cursor] === stopChar) {
      return {
        tokens,
        issues,
        nextCursor: cursor + 1,
        closed: true
      };
    }

    if (source[cursor] === ")" || source[cursor] === "]") {
      issues.push({
        code: "MISMATCHED_CLOSING",
        message: `Mismatched closing ${closingTokenNames[source[cursor] as ")" | "]"]}: ${source[cursor]}`,
        raw: source[cursor],
        index: cursor
      });
      cursor += 1;
      continue;
    }

    if (source[cursor] === "|") {
      if (stopChar !== null) {
        issues.push({
          code: "INVALID_TOKEN",
          message: "Bar lines are not allowed inside notation groups",
          raw: "|",
          index: cursor
        });
        cursor += 1;
        continue;
      }

      if (cursor + 1 < source.length && source[cursor + 1] === "|") {
        tokens.push({
          type: "DOUBLE_BAR",
          raw: "||",
          index: cursor,
          lyricSlots: 0
        });
        cursor += 2;
        continue;
      }

      tokens.push({
        type: "BAR",
        raw: "|",
        index: cursor,
        lyricSlots: 0
      });
      cursor += 1;
      continue;
    }

    if (source[cursor] === "(" || source[cursor] === "[") {
      const parsedGroup = parseGroup(source, cursor);
      if (parsedGroup.token) {
        tokens.push(parsedGroup.token);
      }
      issues.push(...parsedGroup.issues);
      cursor = parsedGroup.nextCursor;
      continue;
    }

    const start = cursor;
    while (cursor < source.length && !isTokenDelimiter(source[cursor])) {
      cursor += 1;
    }

    const raw = source.slice(start, cursor);
    if (raw.length === 0) {
      cursor += 1;
      continue;
    }

    const parsedToken = parseStandaloneToken(raw, start, { allowRest: stopChar === null });
    if (parsedToken.token) {
      tokens.push(parsedToken.token);
    }
    issues.push(...parsedToken.issues);
  }

  return {
    tokens,
    issues,
    nextCursor: cursor,
    closed: false
  };
}

function parseGroup(
  source: string,
  start: number
): { token: NotationSlurToken | NotationBeamToken | null; issues: NotationParserIssue[]; nextCursor: number } {
  const opener = source[start];
  const isSlur = opener === "(";
  const closing = isSlur ? ")" : "]";
  const label = isSlur ? "slur" : "beam";

  const innerResult = parseSequence(source, start + 1, closing);
  const raw = source.slice(start, innerResult.nextCursor);
  const issues = [...innerResult.issues];

  if (!innerResult.closed) {
    issues.push({
      code: isSlur ? "UNCLOSED_SLUR_GROUP" : "UNCLOSED_BEAM_GROUP",
      message: `Unclosed ${label} group`,
      raw: source.slice(start),
      index: start
    });
  }

  const children: NotationGroupChildToken[] = [];
  for (const token of innerResult.tokens) {
    if (isGroupChildToken(token)) {
      children.push(token);
      continue;
    }

    issues.push({
      code: "INVALID_TOKEN",
      message: `${capitalize(label)} groups may contain only notes, extension dots, or nested notation groups`,
      raw: token.raw,
      index: token.index
    });
  }

  if (children.length === 0) {
    issues.push({
      code: "INVALID_TOKEN",
      message: `${capitalize(label)} group must contain at least one note, extension dot, or nested notation group`,
      raw,
      index: start
    });
    return {
      token: null,
      issues,
      nextCursor: innerResult.nextCursor
    };
  }

  if (isSlur) {
    return {
      token: {
        type: "SLUR",
        raw,
        index: start,
        children,
        lyricSlots: 1
      },
      issues,
      nextCursor: innerResult.nextCursor
    };
  }

  return {
    token: {
      type: "BEAM",
      raw,
      index: start,
      children,
      lyricSlots: countNotationLyricSlots(children)
    },
    issues,
    nextCursor: innerResult.nextCursor
  };
}

function parseStandaloneToken(
  originalRaw: string,
  index: number,
  options: { allowRest: boolean }
): { token: NotationNoteToken | NotationRestToken | NotationExtensionToken | null; issues: NotationParserIssue[] } {
  let raw = originalRaw;
  let hasFermata = false;

  if (raw.endsWith("^")) {
    hasFermata = true;
    raw = raw.slice(0, -1);
  }

  if (raw === ".") {
    return {
      token: {
        type: "EXTENSION",
        raw: originalRaw,
        index,
        lyricSlots: 0,
        hasFermata
      },
      issues: []
    };
  }

  if (raw === "0") {
    if (!options.allowRest) {
      return {
        token: null,
        issues: [{
          code: "INVALID_TOKEN",
          message: "Rest tokens are not allowed inside notation groups",
          raw,
          index
        }]
      };
    }

    return {
      token: {
        type: "REST",
        raw: originalRaw,
        index,
        lyricSlots: 0,
        hasFermata
      },
      issues: []
    };
  }

  const match = notePattern.exec(raw);
  if (!match) {
    return {
      token: null,
      issues: [{
        code: "INVALID_TOKEN",
        message: `Invalid notation token: ${originalRaw}`,
        raw: originalRaw,
        index
      }]
    };
  }

  const accidentalPart = match[1];
  const degree = match[2];
  if (degree < "1" || degree > "7") {
    return {
      token: null,
      issues: [{
        code: "INVALID_NOTE_DEGREE",
        message: `Invalid note degree: ${degree}`,
        raw,
        index
      }]
    };
  }

  const octavePart = match[3] ?? "";
  const shortDurationPart = match[4] ?? "";
  const holdPart = match[5] ?? "";

  return {
    token: {
      type: "NOTE",
      raw: originalRaw,
      index,
      accidental: accidentalPart ? (accidentalPart as "#" | "b") : undefined,
      degree,
      octave: octaveValue(octavePart),
      shortDurationLevel: shortDurationPart.length,
      holdCount: holdPart.length,
      lyricSlots: 1,
      hasFermata
    },
    issues: []
  };
}

function renderTokenSequence(
  tokens: readonly NotationToken[],
  startX: number,
  beamDepth: number,
  theme: RenderTheme,
  metrics: RenderMetrics,
  syllables?: Map<NotationToken, string>
): RenderedToken {
  let cursorX = startX;
  const markup: string[] = [];
  const slotAnchors: number[] = [];
  let firstNoteAnchor: number | null = null;

  tokens.forEach((token, index) => {
    let extraPadding = 0;
    if (syllables) {
      const syllable = syllables.get(token);
      if (syllable) {
        const textWidth = estimateLyricTextWidthWithMetrics(syllable, metrics);
        const baseWidth = token.type === "NOTE" ? metrics.noteWidth : (token.type === "SLUR" ? metrics.noteWidth : 0);
        if (textWidth > baseWidth + metrics.tokenGap) {
          extraPadding = textWidth - (baseWidth + metrics.tokenGap);
        }
      }
    }

    cursorX += extraPadding / 2;
    const rendered = renderToken(token, cursorX, beamDepth, theme, metrics, syllables);
    markup.push(...rendered.markup);
    slotAnchors.push(...rendered.slotAnchors);
    if (firstNoteAnchor === null && rendered.firstNoteAnchor !== null) {
      firstNoteAnchor = rendered.firstNoteAnchor;
    }
    cursorX += rendered.width + extraPadding / 2;
    if (index < tokens.length - 1) {
      cursorX += metrics.tokenGap;
    }
  });

  return {
    width: Math.max(cursorX - startX, 0),
    markup,
    slotAnchors,
    firstNoteAnchor
  };
}

function renderToken(
  token: NotationToken,
  x: number,
  beamDepth: number,
  theme: RenderTheme,
  metrics: RenderMetrics,
  syllables?: Map<NotationToken, string>
): RenderedToken {
  switch (token.type) {
    case "NOTE":
      return renderNoteToken(token, x, beamDepth, theme, metrics);
    case "REST":
      return renderRestToken(token, x, theme, metrics);
    case "BAR":
      return renderBarToken(x, theme, metrics);
    case "DOUBLE_BAR":
      return renderDoubleBarToken(x, theme, metrics);
    case "EXTENSION":
      return renderExtensionToken(token, x, theme, metrics);
    case "SLUR":
      return renderSlurToken(token, x, beamDepth, theme, metrics, syllables);
    case "BEAM":
      return renderBeamToken(token, x, beamDepth, theme, metrics, syllables);
    default:
      return {
        width: 0,
        markup: [],
        slotAnchors: [],
        firstNoteAnchor: null
      };
  }
}

function renderNoteToken(
  token: NotationNoteToken,
  x: number,
  beamDepth: number,
  theme: RenderTheme,
  metrics: RenderMetrics
): RenderedToken {
  const centerX = x + metrics.noteWidth / 2;
  const topDotY = beamDepth > 0 ? metrics.topDotYBeamed : metrics.topDotY;
  const markup: string[] = [
    `<text x="${centerX}" y="${metrics.baselineY}" text-anchor="middle" dominant-baseline="middle" font-family="Aptos, Arial, sans-serif" font-size="${metrics.noteFontSize}" font-weight="700" fill="#${theme.notationText}">${escapeXml(token.degree)}</text>`
  ];

  if (token.accidental) {
    const isSharp = token.accidental === "#";
    const yCenter = metrics.baselineY - 3.5 * metrics.scale;
    const dx = 7 * metrics.scale;
    const dy = 11 * metrics.scale;
    const x1 = centerX - dx;
    const x2 = centerX + dx;
    const y1 = isSharp ? yCenter + dy : yCenter - dy;
    const y2 = isSharp ? yCenter - dy : yCenter + dy;
    
    markup.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#${theme.notationText}" stroke-width="${1.8 * metrics.scale}" stroke-linecap="round" opacity="0.9" />`
    );
  }

  if (token.octave > 0) {
    const startX = centerX - ((token.octave - 1) * (4 * metrics.scale)) / 2;
    for (let index = 0; index < token.octave; index += 1) {
      markup.push(`<circle cx="${startX + index * (4 * metrics.scale)}" cy="${topDotY}" r="${metrics.dotRadius}" fill="#${theme.notationText}" />`);
    }
  }

  if (token.octave < 0) {
    const count = Math.abs(token.octave);
    const startX = centerX - ((count - 1) * (4 * metrics.scale)) / 2;
    for (let index = 0; index < count; index += 1) {
      markup.push(`<circle cx="${startX + index * (4 * metrics.scale)}" cy="${metrics.bottomDotY}" r="${metrics.dotRadius}" fill="#${theme.notationText}" />`);
    }
  }

  for (let index = 0; index < token.shortDurationLevel; index += 1) {
    const x1 = x + metrics.noteWidth - 7 * metrics.scale;
    const y1 = 15 * metrics.scale + index * (4 * metrics.scale);
    markup.push(`<line x1="${x1}" y1="${y1}" x2="${x1 + 5 * metrics.scale}" y2="${y1 - 3 * metrics.scale}" stroke="#${theme.notationText}" stroke-width="${1.3 * metrics.scale}" stroke-linecap="round" />`);
  }

  for (let index = 0; index < token.holdCount; index += 1) {
    const x1 = x + metrics.noteWidth - 2 * metrics.scale + index * (5 * metrics.scale);
    markup.push(`<line x1="${x1}" y1="${metrics.baselineY}" x2="${x1 + 4 * metrics.scale}" y2="${metrics.baselineY}" stroke="#${theme.notationText}" stroke-width="${1.3 * metrics.scale}" stroke-linecap="round" />`);
  }

  if (token.hasFermata) {
    const rx = 5 * metrics.scale;
    const ry = 4 * metrics.scale;
    const cy = metrics.fermataY + 2 * metrics.scale;
    markup.push(
      `<path d="M ${centerX - rx} ${cy} Q ${centerX} ${metrics.fermataY - ry} ${centerX + rx} ${cy}" fill="none" stroke="#${theme.notationText}" stroke-width="${1.2 * metrics.scale}" />`,
      `<circle cx="${centerX}" cy="${cy - 1.5 * metrics.scale}" r="${1.2 * metrics.scale}" fill="#${theme.notationText}" />`
    );
  }

  return {
    width: metrics.noteWidth,
    markup,
    slotAnchors: [centerX],
    firstNoteAnchor: centerX
  };
}

function renderRestToken(token: NotationRestToken, x: number, theme: RenderTheme, metrics: RenderMetrics): RenderedToken {
  const centerX = x + metrics.restWidth / 2;
  const markup: string[] = [
    `<text x="${centerX}" y="${metrics.baselineY}" text-anchor="middle" dominant-baseline="middle" font-family="Aptos, Arial, sans-serif" font-size="${metrics.restFontSize}" font-weight="700" fill="#${theme.notationText}" opacity="0.7">0</text>`
  ];

  if (token.hasFermata) {
    const rx = 5 * metrics.scale;
    const ry = 4 * metrics.scale;
    const cy = metrics.fermataY + 2 * metrics.scale;
    markup.push(
      `<path d="M ${centerX - rx} ${cy} Q ${centerX} ${metrics.fermataY - ry} ${centerX + rx} ${cy}" fill="none" stroke="#${theme.notationText}" stroke-width="${1.2 * metrics.scale}" />`,
      `<circle cx="${centerX}" cy="${cy - 1.5 * metrics.scale}" r="${1.2 * metrics.scale}" fill="#${theme.notationText}" />`
    );
  }

  return {
    width: metrics.restWidth,
    markup,
    slotAnchors: [],
    firstNoteAnchor: null
  };
}

function renderBarToken(x: number, theme: RenderTheme, metrics: RenderMetrics): RenderedToken {
  const centerX = x + metrics.barWidth / 2;
  return {
    width: metrics.barWidth,
    markup: [
      `<line x1="${centerX}" y1="${24 * metrics.scale}" x2="${centerX}" y2="${46 * metrics.scale}" stroke="#${theme.notationText}" stroke-width="${1.5 * metrics.scale}" stroke-linecap="round" opacity="0.8" />`
    ],
    slotAnchors: [],
    firstNoteAnchor: null
  };
}

function renderDoubleBarToken(x: number, theme: RenderTheme, metrics: RenderMetrics): RenderedToken {
  const width = metrics.barWidth * 1.5;
  const leftX = x + width / 2 - 2 * metrics.scale;
  const rightX = leftX + 4 * metrics.scale;
  return {
    width,
    markup: [
      `<line x1="${leftX}" y1="${24 * metrics.scale}" x2="${leftX}" y2="${46 * metrics.scale}" stroke="#${theme.notationText}" stroke-width="${1.5 * metrics.scale}" stroke-linecap="round" opacity="0.8" />`,
      `<line x1="${rightX}" y1="${24 * metrics.scale}" x2="${rightX}" y2="${46 * metrics.scale}" stroke="#${theme.notationText}" stroke-width="${3 * metrics.scale}" stroke-linecap="round" opacity="0.8" />`
    ],
    slotAnchors: [],
    firstNoteAnchor: null
  };
}

function renderExtensionToken(token: NotationExtensionToken, x: number, theme: RenderTheme, metrics: RenderMetrics): RenderedToken {
  const centerX = x + metrics.extensionWidth / 2;
  const markup: string[] = [
    `<circle cx="${centerX}" cy="${metrics.extensionDotY}" r="${Math.max(1.8, 2 * metrics.scale)}" fill="#${theme.notationText}" />`
  ];

  if (token.hasFermata) {
    const rx = 5 * metrics.scale;
    const ry = 4 * metrics.scale;
    const cy = metrics.fermataY + 2 * metrics.scale;
    markup.push(
      `<path d="M ${centerX - rx} ${cy} Q ${centerX} ${metrics.fermataY - ry} ${centerX + rx} ${cy}" fill="none" stroke="#${theme.notationText}" stroke-width="${1.2 * metrics.scale}" />`,
      `<circle cx="${centerX}" cy="${cy - 1.5 * metrics.scale}" r="${1.2 * metrics.scale}" fill="#${theme.notationText}" />`
    );
  }

  return {
    width: metrics.extensionWidth,
    markup,
    slotAnchors: [],
    firstNoteAnchor: null
  };
}

function renderSlurToken(
  token: NotationSlurToken,
  x: number,
  beamDepth: number,
  theme: RenderTheme,
  metrics: RenderMetrics,
  syllables?: Map<NotationToken, string>
): RenderedToken {
  const children = renderTokenSequence(token.children, x, beamDepth, theme, metrics, syllables);
  const width = Math.max(children.width, metrics.noteWidth);
  const startX = x + 1;
  const endX = x + width - 1;
  const midX = x + width / 2;
  const anchor = children.firstNoteAnchor;

  return {
    width,
    markup: [
      ...children.markup,
      `<path d="M ${startX} ${metrics.slurBaseY - 2 * metrics.scale} Q ${midX} ${metrics.slurBaseY + 4 * metrics.scale} ${endX} ${metrics.slurBaseY - 2 * metrics.scale}" fill="none" stroke="#${theme.notationText}" stroke-width="${1.3 * metrics.scale}" stroke-linecap="round" opacity="0.85" />`
    ],
    slotAnchors: anchor !== null ? [anchor] : [],
    firstNoteAnchor: anchor
  };
}

function renderBeamToken(
  token: NotationBeamToken,
  x: number,
  beamDepth: number,
  theme: RenderTheme,
  metrics: RenderMetrics,
  syllables?: Map<NotationToken, string>
): RenderedToken {
  const nextBeamDepth = Math.min(beamDepth + 1, 2);
  const children = renderTokenSequence(token.children, x, nextBeamDepth, theme, metrics, syllables);
  const width = Math.max(children.width, metrics.noteWidth);
  const beamY = nextBeamDepth === 1 ? metrics.beamLevelOneY : metrics.beamLevelTwoY;
  
  const startX = children.firstNoteAnchor !== null ? children.firstNoteAnchor : x + 2 * metrics.scale;
  // approximate the right anchor symmetrically
  const offsetFromLeft = startX - x;
  const endX = (x + width) - offsetFromLeft;

  return {
    width,
    markup: [
      ...children.markup,
      `<line x1="${startX}" y1="${beamY}" x2="${endX}" y2="${beamY}" stroke="#${theme.notationText}" stroke-width="${2.2 * metrics.scale}" stroke-linecap="round" />`
    ],
    slotAnchors: children.slotAnchors,
    firstNoteAnchor: children.firstNoteAnchor
  };
}

function renderLyricText(anchorX: number, text: string, color: string, metrics: RenderMetrics): string {
  return `<text x="${anchorX}" y="${metrics.lyricBaselineY}" text-anchor="middle" dominant-baseline="middle" font-family="Aptos, Arial, sans-serif" font-size="${metrics.lyricFontSize}" font-weight="600" fill="#${color}">${escapeXml(text)}</text>`;
}

function renderPlainNotationSvg(
  notation: string,
  lyric: string | null | undefined,
  theme: RenderTheme,
  metrics: RenderMetrics
): { svg: string; width: number; height: number } {
  const hasLyric = Boolean(lyric && lyric.trim().length > 0);
  const height = hasLyric ? metrics.notationHeight + metrics.lyricHeight : metrics.notationHeight;
  const textY = hasLyric ? 24 * metrics.scale : 28 * metrics.scale;
  const width = 1200;

  return {
    svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMid meet" role="img">`,
      `<text x="0" y="${textY}" font-family="Courier New, ui-monospace, monospace" font-size="${metrics.plainNotationFontSize}" font-weight="700" fill="#${theme.notationText}">${escapeXml(notation)}</text>`,
      hasLyric ? `<text x="0" y="${metrics.lyricBaselineY}" font-family="Aptos, Arial, sans-serif" font-size="${metrics.lyricFontSize}" font-weight="600" fill="#${theme.lyricText}">${escapeXml(lyric ?? "")}</text>` : "",
      "</svg>"
    ].join(""),
    width,
    height
  };
}

function isGroupChildToken(token: NotationToken): token is NotationGroupChildToken {
  return token.type === "NOTE" || token.type === "EXTENSION" || token.type === "SLUR" || token.type === "BEAM";
}

function isTokenDelimiter(value: string) {
  return /\s/.test(value) || value === "(" || value === ")" || value === "[" || value === "]" || value === "|";
}

function octaveValue(value: string) {
  return [...value].reduce((total, marker) => total + (marker === "'" ? 1 : -1), 0);
}

function findFirstRenderableNote(tokens: readonly NotationToken[]): NotationNoteToken | null {
  for (const token of tokens) {
    if (token.type === "NOTE") {
      return token;
    }

    if (token.type === "SLUR" || token.type === "BEAM") {
      const nested = findFirstRenderableNote(token.children);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function resolveLyricPlacements(
  anchors: readonly number[],
  syllables: readonly string[],
  notationWidth: number,
  metrics: RenderMetrics
): LyricPlacement[] {
  const placements: LyricPlacement[] = [];
  let previousRight = 0;

  syllables.forEach((text, index) => {
    const width = estimateLyricTextWidthWithMetrics(text, metrics);
    const anchorX = anchors[index] ?? previousRight;
    const minCenter = width / 2;
    const centerX = Math.max(anchorX, minCenter);
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    placements.push({
      text,
      anchorX,
      centerX,
      width,
      left,
      right
    });
    previousRight = right;
  });

  if (placements.length === 0) {
    return placements;
  }

  const maxRight = placements[placements.length - 1]?.right ?? notationWidth;
  const minLeft = placements[0]?.left ?? 0;
  const overflow = Math.max(0, maxRight - notationWidth);
  const shiftLeft = Math.min(overflow, Math.max(0, minLeft));

  if (shiftLeft > 0) {
    placements.forEach((placement) => {
      placement.centerX -= shiftLeft;
      placement.left -= shiftLeft;
      placement.right -= shiftLeft;
    });
  }

  return placements;
}

function estimateLyricTextWidthWithMetrics(text: string, metrics: RenderMetrics) {
  const estimated = [...text].reduce((total, character) => total + characterWidthFactor(character), 0) * metrics.lyricFontSize;
  return Math.max(18 * metrics.scale, Math.ceil(estimated + metrics.lyricHorizontalPadding));
}

function characterWidthFactor(character: string) {
  if (/[ilj'.,]/.test(character)) {
    return 0.28;
  }

  if (/[- ]/.test(character)) {
    return 0.34;
  }

  if (/[frtI]/.test(character)) {
    return 0.38;
  }

  if (/[mwMW]/.test(character)) {
    return 0.9;
  }

  if (/[A-Z]/.test(character)) {
    return 0.7;
  }

  if (/[0-9]/.test(character)) {
    return 0.58;
  }

  return 0.56;
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildNotationSvgDataUri(options: RenderLineOptions): string {
  return buildNotationSvgDataUriFromSvg(renderNotationLineSvg(options).svg);
}

export function buildNotationSvgDataUriFromSvg(svg: string): string {
  const encoded = Buffer.from(svg, "utf-8").toString("base64");
  return `image/svg+xml;base64,${encoded}`;
}

export function createNotationTheme(theme: ExportPayload["layout"]["theme"]): RenderTheme {
  if (theme === "DARK") {
    return {
      notationText: "FDE68A",
      lyricText: "F8FAFC"
    };
  }

  return {
    notationText: "1F2937",
    lyricText: "111827"
  };
}
