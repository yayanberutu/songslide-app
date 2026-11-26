import { parseNotationLine, type NotationToken } from "./notation-parser";

export type HighlightSegmentType =
  | "text"
  | "note"
  | "rest"
  | "bar"
  | "beam"
  | "slur"
  | "extension"
  | "fermata"
  | "invalid";

export type HighlightSegment = {
  text: string;
  type: HighlightSegmentType;
  issueMessage?: string;
};

/**
 * Builds highlight segments from a notation line by leveraging parseNotationLine.
 * Guaranteed invariant: segments.map(s => s.text).join("") === line.
 */
export function buildHighlightSegments(line: string): HighlightSegment[] {
  if (line.length === 0) {
    return [];
  }

  const { tokens, issues } = parseNotationLine(line);
  const leadingWs = line.length - line.trimStart().length;

  const types: HighlightSegmentType[] = new Array(line.length).fill("text");
  const issueMessages: (string | undefined)[] = new Array(line.length).fill(undefined);

  function applyToken(token: NotationToken) {
    const tokenIndex = token.index + leadingWs;

    if (token.type === "NOTE") {
      const end = Math.min(line.length, tokenIndex + token.raw.length);
      for (let i = tokenIndex; i < end; i++) {
        types[i] = "note";
      }
      if (token.hasFermata && token.raw.endsWith("^") && end - 1 >= 0) {
        types[end - 1] = "fermata";
      }
      return;
    }

    if (token.type === "REST") {
      const end = Math.min(line.length, tokenIndex + token.raw.length);
      for (let i = tokenIndex; i < end; i++) {
        types[i] = "rest";
      }
      if (token.hasFermata && token.raw.endsWith("^") && end - 1 >= 0) {
        types[end - 1] = "fermata";
      }
      return;
    }

    if (token.type === "BAR" || token.type === "DOUBLE_BAR") {
      const end = Math.min(line.length, tokenIndex + token.raw.length);
      for (let i = tokenIndex; i < end; i++) {
        types[i] = "bar";
      }
      return;
    }

    if (token.type === "EXTENSION") {
      const end = Math.min(line.length, tokenIndex + token.raw.length);
      for (let i = tokenIndex; i < end; i++) {
        types[i] = "extension";
      }
      if (token.hasFermata && token.raw.endsWith("^") && end - 1 >= 0) {
        types[end - 1] = "fermata";
      }
      return;
    }

    if (token.type === "BEAM") {
      if (tokenIndex < line.length) {
        types[tokenIndex] = "beam";
      }
      const closeIndex = tokenIndex + token.raw.length - 1;
      if (closeIndex < line.length && token.raw.endsWith("]")) {
        types[closeIndex] = "beam";
      }
      for (const child of token.children) {
        applyToken(child);
      }
      return;
    }

    if (token.type === "SLUR") {
      if (tokenIndex < line.length) {
        types[tokenIndex] = "slur";
      }
      const closeIndex = tokenIndex + token.raw.length - 1;
      if (closeIndex < line.length && token.raw.endsWith(")")) {
        types[closeIndex] = "slur";
      }
      for (const child of token.children) {
        applyToken(child);
      }
      return;
    }
  }

  for (const token of tokens) {
    applyToken(token);
  }

  // Apply issues / invalid tokens
  for (const issue of issues) {
    const issueIndex = issue.index + leadingWs;
    if (issue.code === "UNCLOSED_BEAM_GROUP" || issue.code === "UNCLOSED_SLUR_GROUP") {
      // Mark just the opening unclosed bracket as invalid
      if (issueIndex >= 0 && issueIndex < line.length) {
        types[issueIndex] = "invalid";
        issueMessages[issueIndex] = issue.message;
      }
    } else {
      const start = Math.max(0, issueIndex);
      const len = Math.max(1, issue.raw.length);
      const end = Math.min(line.length, start + len);
      for (let i = start; i < end; i++) {
        types[i] = "invalid";
        issueMessages[i] = issue.message;
      }
    }
  }

  // Merge contiguous runs with the same type and issueMessage
  const segments: HighlightSegment[] = [];
  let currentText = line[0];
  let currentType = types[0];
  let currentIssue = issueMessages[0];

  for (let i = 1; i < line.length; i++) {
    if (types[i] === currentType && issueMessages[i] === currentIssue) {
      currentText += line[i];
    } else {
      segments.push({
        text: currentText,
        type: currentType,
        issueMessage: currentIssue
      });
      currentText = line[i];
      currentType = types[i];
      currentIssue = issueMessages[i];
    }
  }

  segments.push({
    text: currentText,
    type: currentType,
    issueMessage: currentIssue
  });

  return segments;
}
