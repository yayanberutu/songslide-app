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
};

export type NotationNoteToken = NotationTokenBase & {
  type: "NOTE";
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

type RenderTheme = {
  notationText: string;
  lyricText: string;
};

type RenderedToken = {
  width: number;
  markup: string[];
  slotAnchors: number[];
  firstNoteAnchor: number | null;
};

type RenderLineOptions = {
  notation: string;
  lyric?: string | null;
  theme: Pick<RenderTheme, "notationText" | "lyricText">;
};

type RenderedLine = {
  svg: string;
  issues: NotationParserIssue[];
  slotAnchors: number[];
};

const notePattern = /^([0-9])([',]*)(\/{1,2})?(-{1,2})?$/;
const closingTokenNames: Record<")" | "]", string> = {
  ")": "parenthesis",
  "]": "bracket"
};

const NOTE_WIDTH = 28;
const REST_WIDTH = 22;
const EXTENSION_WIDTH = 18;
const BAR_WIDTH = 12;
const TOKEN_GAP = 8;
const NOTATION_HEIGHT = 54;
const LYRIC_HEIGHT = 28;
const TOTAL_HEIGHT_WITH_LYRIC = NOTATION_HEIGHT + LYRIC_HEIGHT;
const TOTAL_HEIGHT_NOTATION_ONLY = NOTATION_HEIGHT;
const BASELINE_Y = 29;
const TOP_DOT_Y = 13;
const TOP_DOT_Y_BEAMED = 16;
const BOTTOM_DOT_Y = 40;
const EXTENSION_DOT_Y = 36;
const BEAM_LEVEL_ONE_Y = 8;
const BEAM_LEVEL_TWO_Y = 13;
const SLUR_BASE_Y = 46;
const LYRIC_BASELINE_Y = 73;

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

export function renderNotationLineSvg(options: RenderLineOptions): RenderedLine {
  const parsed = parseNotationLine(options.notation);
  if (parsed.issues.length > 0) {
    return {
      svg: renderPlainNotationSvg(options.notation, options.lyric, options.theme),
      issues: parsed.issues,
      slotAnchors: []
    };
  }

  const topLevel = renderTokenSequence(parsed.tokens, 0, 0, options.theme);
  const lyricSyllables = parseLyricSyllables(options.lyric);
  const hasLyric = lyricSyllables.length > 0;
  const height = hasLyric ? TOTAL_HEIGHT_WITH_LYRIC : TOTAL_HEIGHT_NOTATION_ONLY;
  const width = Math.max(Math.ceil(topLevel.width), 1);

  const lyricMarkup = hasLyric
    ? lyricSyllables
        .slice(0, topLevel.slotAnchors.length)
        .map((syllable, index) => renderLyricText(topLevel.slotAnchors[index], syllable, options.theme.lyricText))
        .join("")
    : "";

  return {
    svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMinYMid meet" role="img">`,
      `<g>${topLevel.markup.join("")}</g>`,
      lyricMarkup,
      "</svg>"
    ].join(""),
    issues: [],
    slotAnchors: topLevel.slotAnchors
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
      } else {
        tokens.push({
          type: "BAR",
          raw: "|",
          index: cursor,
          lyricSlots: 0
        });
      }
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
  raw: string,
  index: number,
  options: { allowRest: boolean }
): { token: NotationNoteToken | NotationRestToken | NotationExtensionToken | null; issues: NotationParserIssue[] } {
  if (raw === ".") {
    return {
      token: {
        type: "EXTENSION",
        raw,
        index,
        lyricSlots: 0
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
        raw,
        index,
        lyricSlots: 0
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
        message: `Invalid notation token: ${raw}`,
        raw,
        index
      }]
    };
  }

  const degree = match[1];
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

  const octavePart = match[2] ?? "";
  const shortDurationPart = match[3] ?? "";
  const holdPart = match[4] ?? "";

  return {
    token: {
      type: "NOTE",
      raw,
      index,
      degree,
      octave: octaveValue(octavePart),
      shortDurationLevel: shortDurationPart.length,
      holdCount: holdPart.length,
      lyricSlots: 1
    },
    issues: []
  };
}

function renderTokenSequence(
  tokens: readonly NotationToken[],
  startX: number,
  beamDepth: number,
  theme: RenderTheme
): RenderedToken {
  let cursorX = startX;
  const markup: string[] = [];
  const slotAnchors: number[] = [];
  let firstNoteAnchor: number | null = null;

  tokens.forEach((token, index) => {
    const rendered = renderToken(token, cursorX, beamDepth, theme);
    markup.push(...rendered.markup);
    slotAnchors.push(...rendered.slotAnchors);
    if (firstNoteAnchor === null && rendered.firstNoteAnchor !== null) {
      firstNoteAnchor = rendered.firstNoteAnchor;
    }
    cursorX += rendered.width;
    if (index < tokens.length - 1) {
      cursorX += TOKEN_GAP;
    }
  });

  return {
    width: Math.max(cursorX - startX, 0),
    markup,
    slotAnchors,
    firstNoteAnchor
  };
}

function renderToken(token: NotationToken, x: number, beamDepth: number, theme: RenderTheme): RenderedToken {
  switch (token.type) {
    case "NOTE":
      return renderNoteToken(token, x, beamDepth, theme);
    case "REST":
      return renderRestToken(x, theme);
    case "BAR":
      return renderBarToken(x, theme);
    case "EXTENSION":
      return renderExtensionToken(x, theme);
    case "SLUR":
      return renderSlurToken(token, x, beamDepth, theme);
    case "BEAM":
      return renderBeamToken(token, x, beamDepth, theme);
    default:
      return {
        width: 0,
        markup: [],
        slotAnchors: [],
        firstNoteAnchor: null
      };
  }
}

function renderNoteToken(token: NotationNoteToken, x: number, beamDepth: number, theme: RenderTheme): RenderedToken {
  const centerX = x + NOTE_WIDTH / 2;
  const topDotY = beamDepth > 0 ? TOP_DOT_Y_BEAMED : TOP_DOT_Y;
  const markup: string[] = [
    `<text x="${centerX}" y="${BASELINE_Y}" text-anchor="middle" dominant-baseline="middle" font-family="Aptos, Arial, sans-serif" font-size="24" font-weight="700" fill="#${theme.notationText}">${escapeXml(token.degree)}</text>`
  ];

  if (token.octave > 0) {
    const startX = centerX - ((token.octave - 1) * 4) / 2;
    for (let index = 0; index < token.octave; index += 1) {
      markup.push(`<circle cx="${startX + index * 4}" cy="${topDotY}" r="1.4" fill="#${theme.notationText}" />`);
    }
  }

  if (token.octave < 0) {
    const count = Math.abs(token.octave);
    const startX = centerX - ((count - 1) * 4) / 2;
    for (let index = 0; index < count; index += 1) {
      markup.push(`<circle cx="${startX + index * 4}" cy="${BOTTOM_DOT_Y}" r="1.4" fill="#${theme.notationText}" />`);
    }
  }

  for (let index = 0; index < token.shortDurationLevel; index += 1) {
    const x1 = x + NOTE_WIDTH - 7;
    const y1 = 15 + index * 4;
    markup.push(`<line x1="${x1}" y1="${y1}" x2="${x1 + 5}" y2="${y1 - 3}" stroke="#${theme.notationText}" stroke-width="1.3" stroke-linecap="round" />`);
  }

  for (let index = 0; index < token.holdCount; index += 1) {
    const x1 = x + NOTE_WIDTH - 2 + index * 5;
    markup.push(`<line x1="${x1}" y1="${BASELINE_Y}" x2="${x1 + 4}" y2="${BASELINE_Y}" stroke="#${theme.notationText}" stroke-width="1.3" stroke-linecap="round" />`);
  }

  return {
    width: NOTE_WIDTH,
    markup,
    slotAnchors: [centerX],
    firstNoteAnchor: centerX
  };
}

function renderRestToken(x: number, theme: RenderTheme): RenderedToken {
  const centerX = x + REST_WIDTH / 2;
  return {
    width: REST_WIDTH,
    markup: [
      `<text x="${centerX}" y="${BASELINE_Y}" text-anchor="middle" dominant-baseline="middle" font-family="Aptos, Arial, sans-serif" font-size="22" font-weight="700" fill="#${theme.notationText}" opacity="0.7">0</text>`
    ],
    slotAnchors: [],
    firstNoteAnchor: null
  };
}

function renderBarToken(x: number, theme: RenderTheme): RenderedToken {
  const centerX = x + BAR_WIDTH / 2;
  return {
    width: BAR_WIDTH,
    markup: [
      `<line x1="${centerX}" y1="18" x2="${centerX}" y2="40" stroke="#${theme.notationText}" stroke-width="1.5" stroke-linecap="round" opacity="0.8" />`
    ],
    slotAnchors: [],
    firstNoteAnchor: null
  };
}

function renderExtensionToken(x: number, theme: RenderTheme): RenderedToken {
  const centerX = x + EXTENSION_WIDTH / 2;
  return {
    width: EXTENSION_WIDTH,
    markup: [
      `<circle cx="${centerX}" cy="${EXTENSION_DOT_Y}" r="2" fill="#${theme.notationText}" />`
    ],
    slotAnchors: [],
    firstNoteAnchor: null
  };
}

function renderSlurToken(token: NotationSlurToken, x: number, beamDepth: number, theme: RenderTheme): RenderedToken {
  const children = renderTokenSequence(token.children, x, beamDepth, theme);
  const width = Math.max(children.width, NOTE_WIDTH);
  const startX = x + 1;
  const endX = x + width - 1;
  const midX = x + width / 2;
  const anchor = children.firstNoteAnchor;

  return {
    width,
    markup: [
      ...children.markup,
      `<path d="M ${startX} ${SLUR_BASE_Y - 2} Q ${midX} ${SLUR_BASE_Y + 4} ${endX} ${SLUR_BASE_Y - 2}" fill="none" stroke="#${theme.notationText}" stroke-width="1.3" stroke-linecap="round" opacity="0.85" />`
    ],
    slotAnchors: anchor !== null ? [anchor] : [],
    firstNoteAnchor: anchor
  };
}

function renderBeamToken(token: NotationBeamToken, x: number, beamDepth: number, theme: RenderTheme): RenderedToken {
  const nextBeamDepth = Math.min(beamDepth + 1, 2);
  const children = renderTokenSequence(token.children, x, nextBeamDepth, theme);
  const width = Math.max(children.width, NOTE_WIDTH);
  const beamY = nextBeamDepth === 1 ? BEAM_LEVEL_ONE_Y : BEAM_LEVEL_TWO_Y;

  return {
    width,
    markup: [
      ...children.markup,
      `<line x1="${x + 2}" y1="${beamY}" x2="${x + width - 2}" y2="${beamY}" stroke="#${theme.notationText}" stroke-width="2.2" stroke-linecap="round" />`
    ],
    slotAnchors: children.slotAnchors,
    firstNoteAnchor: children.firstNoteAnchor
  };
}

function renderLyricText(anchorX: number, text: string, color: string): string {
  return `<text x="${anchorX}" y="${LYRIC_BASELINE_Y}" text-anchor="middle" dominant-baseline="middle" font-family="Aptos, Arial, sans-serif" font-size="22" font-weight="400" fill="#${color}">${escapeXml(text)}</text>`;
}

function renderPlainNotationSvg(notation: string, lyric: string | null | undefined, theme: RenderTheme): string {
  const hasLyric = Boolean(lyric && lyric.trim().length > 0);
  const height = hasLyric ? TOTAL_HEIGHT_WITH_LYRIC : TOTAL_HEIGHT_NOTATION_ONLY;
  const textY = hasLyric ? 24 : 28;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 ${height}" preserveAspectRatio="xMinYMid meet" role="img">`,
    `<text x="0" y="${textY}" font-family="Courier New, ui-monospace, monospace" font-size="22" font-weight="700" fill="#${theme.notationText}">${escapeXml(notation)}</text>`,
    hasLyric ? `<text x="0" y="${LYRIC_BASELINE_Y}" font-family="Aptos, Arial, sans-serif" font-size="22" fill="#${theme.lyricText}">${escapeXml(lyric ?? "")}</text>` : "",
    "</svg>"
  ].join("");
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
  const rendered = renderNotationLineSvg(options);
  const encoded = Buffer.from(rendered.svg, "utf-8").toString("base64");
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
