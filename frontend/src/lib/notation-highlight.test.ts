import assert from "node:assert/strict";
import test from "node:test";
import { buildHighlightSegments } from "./notation-highlight";

test("buildHighlightSegments preserves the exact original string", () => {
  const samples = [
    "",
    "1 2 3",
    "5 .6 5 5 6 | 1 .2 1 .6",
    "[4 5] (4 5) ([4 5 6])",
    "1 . | 0 ||",
    "1^ 0^ .^",
    "invalid token & 8 [unclosed",
    "   leading and trailing spaces   "
  ];

  for (const sample of samples) {
    const segments = buildHighlightSegments(sample);
    const reconstructed = segments.map((s) => s.text).join("");
    assert.equal(reconstructed, sample, `Failed for input: "${sample}"`);
  }
});

test("buildHighlightSegments classifies tokens correctly", () => {
  const line = "1 . | [4 5] (3 2) 0 ||";
  const segments = buildHighlightSegments(line);

  // 1 -> note
  assert.equal(segments.find((s) => s.text === "1")?.type, "note");
  // . -> extension
  assert.equal(segments.find((s) => s.text === ".")?.type, "extension");
  // | -> bar
  assert.equal(segments.find((s) => s.text === "|")?.type, "bar");
  // || -> bar
  assert.equal(segments.find((s) => s.text === "||")?.type, "bar");
  // 0 -> rest
  assert.equal(segments.find((s) => s.text === "0")?.type, "rest");

  // beam brackets
  const beamOpen = segments.find((s) => s.text === "[");
  assert.ok(beamOpen && beamOpen.type === "beam");
  const beamClose = segments.find((s) => s.text === "]");
  assert.ok(beamClose && beamClose.type === "beam");

  // slur parentheses
  const slurOpen = segments.find((s) => s.text === "(");
  assert.ok(slurOpen && slurOpen.type === "slur");
  const slurClose = segments.find((s) => s.text === ")");
  assert.ok(slurClose && slurClose.type === "slur");
});

test("buildHighlightSegments marks invalid tokens and unclosed groups as invalid", () => {
  const line = "1 8 [4 5";
  const segments = buildHighlightSegments(line);

  // 8 is invalid note degree
  const invalidEight = segments.find((s) => s.text === "8");
  assert.ok(invalidEight && invalidEight.type === "invalid");
  assert.match(invalidEight.issueMessage ?? "", /Invalid note degree/);

  // '[' is unclosed beam
  const unclosedBracket = segments.find((s) => s.text === "[");
  assert.ok(unclosedBracket && unclosedBracket.type === "invalid");
  assert.match(unclosedBracket.issueMessage ?? "", /Unclosed beam group/);

  // '4' and '5' inside should still be classified as note
  assert.equal(segments.find((s) => s.text === "4")?.type, "note");
  assert.equal(segments.find((s) => s.text === "5")?.type, "note");
});

test("buildHighlightSegments handles fermata on note, rest, and extension", () => {
  const line = "1^ 0^ .^";
  const segments = buildHighlightSegments(line);

  const fermatas = segments.filter((s) => s.type === "fermata");
  assert.equal(fermatas.length, 3);
});

test("buildHighlightSegments correctly aligns tokens with leading whitespace", () => {
  const line = " 1 2 3";
  const segments = buildHighlightSegments(line);

  // First segment is leading whitespace (type text)
  assert.equal(segments[0]?.text, " ");
  assert.equal(segments[0]?.type, "text");

  // Followed by note 1
  assert.equal(segments[1]?.text, "1");
  assert.equal(segments[1]?.type, "note");

  // Followed by space
  assert.equal(segments[2]?.text, " ");
  assert.equal(segments[2]?.type, "text");

  // Followed by note 2
  assert.equal(segments[3]?.text, "2");
  assert.equal(segments[3]?.type, "note");

  // Multiple leading spaces with group
  const multiSpaceLine = "   [4 5]";
  const multiSegments = buildHighlightSegments(multiSpaceLine);
  assert.equal(multiSegments[0]?.text, "   ");
  assert.equal(multiSegments[0]?.type, "text");
  assert.equal(multiSegments[1]?.text, "[");
  assert.equal(multiSegments[1]?.type, "beam");
  assert.equal(multiSegments[2]?.text, "4");
  assert.equal(multiSegments[2]?.type, "note");

  // Leading spaces with invalid token
  const invalidLine = "  8";
  const invalidSegments = buildHighlightSegments(invalidLine);
  assert.equal(invalidSegments[0]?.text, "  ");
  assert.equal(invalidSegments[0]?.type, "text");
  assert.equal(invalidSegments[1]?.text, "8");
  assert.equal(invalidSegments[1]?.type, "invalid");
});
