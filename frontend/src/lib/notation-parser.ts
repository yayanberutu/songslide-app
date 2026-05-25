export type NotationParserIssueCode =
  | "INVALID_TOKEN"
  | "INVALID_NOTE_DEGREE"
  | "UNCLOSED_SLUR_GROUP";

export type NotationParserIssue = {
  code: NotationParserIssueCode;
  message: string;
  raw: string;
  index: number;
};

export type NotationNoteToken = {
  type: "NOTE";
  raw: string;
  degree: string;
  octave: number;
  shortDurationLevel: number;
  holdCount: number;
  lyricSlots: 1;
};

export type NotationRestToken = {
  type: "REST";
  raw: string;
  lyricSlots: 0;
};

export type NotationBarToken = {
  type: "BAR";
  raw: string;
  lyricSlots: 0;
};

export type NotationSlurToken = {
  type: "SLUR";
  raw: string;
  children: NotationNoteToken[];
  lyricSlots: 1;
};

export type NotationToken =
  | NotationNoteToken
  | NotationRestToken
  | NotationBarToken
  | NotationSlurToken;

export type NotationParseResult = {
  tokens: NotationToken[];
  issues: NotationParserIssue[];
};

const notePattern = /^([0-9])([',]*)(\/{1,2})?(-{1,2})?$/;

export function parseNotationLine(input: string | null | undefined): NotationParseResult {
  const source = input?.trim() ?? "";
  if (source.length === 0) {
    return { tokens: [], issues: [] };
  }

  const tokens: NotationToken[] = [];
  const issues: NotationParserIssue[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor += 1;
      continue;
    }

    const start = cursor;

    if (source[cursor] === "|") {
      tokens.push({ type: "BAR", raw: "|", lyricSlots: 0 });
      cursor += 1;
      continue;
    }

    if (source[cursor] === "(") {
      const group = parseSlurGroup(source, start);
      if (group.token) {
        tokens.push(group.token);
      }
      issues.push(...group.issues);
      cursor = group.nextCursor;
      continue;
    }

    while (cursor < source.length && !/\s/.test(source[cursor])) {
      if (source[cursor] === "(" || source[cursor] === "|") {
        break;
      }
      cursor += 1;
    }

    const raw = source.slice(start, cursor);
    if (raw.length === 0) {
      cursor += 1;
      continue;
    }

    const parsed = parseStandaloneToken(raw, start);
    if (parsed.token) {
      tokens.push(parsed.token);
    }
    issues.push(...parsed.issues);
  }

  return { tokens, issues };
}

export function countNotationLyricSlots(tokens: NotationToken[]) {
  return tokens.reduce((total, token) => total + token.lyricSlots, 0);
}

function parseSlurGroup(
  source: string,
  start: number
): { token: NotationSlurToken | null; issues: NotationParserIssue[]; nextCursor: number } {
  let cursor = start + 1;

  while (cursor < source.length && source[cursor] !== ")") {
    cursor += 1;
  }

  if (cursor >= source.length) {
    return {
      token: null,
      issues: [{
        code: "UNCLOSED_SLUR_GROUP",
        message: "Unclosed slur group",
        raw: source.slice(start),
        index: start
      }],
      nextCursor: source.length
    };
  }

  const raw = source.slice(start, cursor + 1);
  const inner = raw.slice(1, -1).trim();
  if (inner.length === 0) {
    return {
      token: null,
      issues: [{
        code: "INVALID_TOKEN",
        message: "Slur group must contain note tokens",
        raw,
        index: start
      }],
      nextCursor: cursor + 1
    };
  }

  const children: NotationNoteToken[] = [];
  const issues: NotationParserIssue[] = [];
  let childOffset = start + 1;

  inner.split(/\s+/).forEach((part) => {
    const childIndex = raw.indexOf(part, childOffset - start) + start;
    childOffset = childIndex + part.length;
    const parsed = parseStandaloneToken(part, childIndex, { allowBar: false, allowRest: false });
    if (parsed.token?.type === "NOTE") {
      children.push(parsed.token);
    } else if (parsed.token) {
      issues.push({
        code: "INVALID_TOKEN",
        message: "Only note tokens are allowed inside a slur group",
        raw: part,
        index: childIndex
      });
    }
    issues.push(...parsed.issues);
  });

  if (issues.length > 0 || children.length === 0) {
    return { token: null, issues, nextCursor: cursor + 1 };
  }

  return {
    token: {
      type: "SLUR",
      raw,
      children,
      lyricSlots: 1
    },
    issues,
    nextCursor: cursor + 1
  };
}

function parseStandaloneToken(
  raw: string,
  index: number,
  options: { allowBar?: boolean; allowRest?: boolean } = {}
): { token: NotationToken | null; issues: NotationParserIssue[] } {
  const allowBar = options.allowBar ?? true;
  const allowRest = options.allowRest ?? true;

  if (allowBar && raw === "|") {
    return { token: { type: "BAR", raw, lyricSlots: 0 }, issues: [] };
  }

  if (allowRest && raw === "0") {
    return { token: { type: "REST", raw, lyricSlots: 0 }, issues: [] };
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
      degree,
      octave: octaveValue(octavePart),
      shortDurationLevel: shortDurationPart.length,
      holdCount: holdPart.length,
      lyricSlots: 1
    },
    issues: []
  };
}

function octaveValue(value: string) {
  return [...value].reduce((total, marker) => total + (marker === "'" ? 1 : -1), 0);
}
