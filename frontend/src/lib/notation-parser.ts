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

const notePattern = /^([0-9])([',]*)(\/{1,2})?(-{1,2})?$/;
const closingTokenNames: Record<")" | "]", string> = {
  ")": "parenthesis",
  "]": "bracket"
};

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

function isGroupChildToken(token: NotationToken): token is NotationGroupChildToken {
  return token.type === "NOTE" || token.type === "EXTENSION" || token.type === "SLUR" || token.type === "BEAM";
}

function isTokenDelimiter(value: string) {
  return /\s/.test(value) || value === "(" || value === ")" || value === "[" || value === "]" || value === "|";
}

function octaveValue(value: string) {
  return [...value].reduce((total, marker) => total + (marker === "'" ? 1 : -1), 0);
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
