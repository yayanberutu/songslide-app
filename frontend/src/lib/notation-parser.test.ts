import assert from "node:assert/strict";
import test from "node:test";
import { alignNotationAndLyric } from "./alignment";
import { countNotationLyricSlots, parseNotationLine } from "./notation-parser";

test("parses octave, legacy duration, and hold markers", () => {
  const parsed = parseNotationLine("1' 1, 1/ 1// 1-");

  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.tokens.length, 5);

  assert.equal(parsed.tokens[0]?.type, "NOTE");
  assert.equal(parsed.tokens[0]?.octave, 1);

  assert.equal(parsed.tokens[1]?.type, "NOTE");
  assert.equal(parsed.tokens[1]?.octave, -1);

  assert.equal(parsed.tokens[2]?.type, "NOTE");
  assert.equal(parsed.tokens[2]?.shortDurationLevel, 1);

  assert.equal(parsed.tokens[3]?.type, "NOTE");
  assert.equal(parsed.tokens[3]?.shortDurationLevel, 2);

  assert.equal(parsed.tokens[4]?.type, "NOTE");
  assert.equal(parsed.tokens[4]?.holdCount, 1);
});

test("parses bar and extension tokens without lyric slots", () => {
  const parsed = parseNotationLine("2 . | 1");

  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.tokens[1]?.type, "EXTENSION");
  assert.equal(parsed.tokens[1]?.lyricSlots, 0);
  assert.equal(parsed.tokens[2]?.type, "BAR");
  assert.equal(parsed.tokens[2]?.lyricSlots, 0);
});

test("parses beam and slur groups with correct lyric slot counts", () => {
  assert.equal(countNotationLyricSlots(parseNotationLine("[4 5]").tokens), 2);
  assert.equal(countNotationLyricSlots(parseNotationLine("[4 5 6]").tokens), 3);
  assert.equal(countNotationLyricSlots(parseNotationLine("[4 3 [3 2]]").tokens), 4);
  assert.equal(countNotationLyricSlots(parseNotationLine("[5 [6 5]]").tokens), 3);
  assert.equal(countNotationLyricSlots(parseNotationLine("(4 3 2)").tokens), 1);
  assert.equal(countNotationLyricSlots(parseNotationLine("([4 5 6])").tokens), 1);
  assert.equal(countNotationLyricSlots(parseNotationLine("[(4 5) 6]").tokens), 2);
  assert.equal(countNotationLyricSlots(parseNotationLine("[4 (5 6)]").tokens), 2);
  assert.equal(countNotationLyricSlots(parseNotationLine("[4 .]").tokens), 1);
  assert.equal(countNotationLyricSlots(parseNotationLine("(4 . 5)").tokens), 1);
  assert.equal(countNotationLyricSlots(parseNotationLine("[(4 .) 5]").tokens), 2);
});

test("preserves nested beam structure", () => {
  const parsed = parseNotationLine("[4 3 [3 2]]");

  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.tokens[0]?.type, "BEAM");
  assert.equal(parsed.tokens[0]?.children.length, 3);
  assert.equal(parsed.tokens[0]?.children[2]?.type, "BEAM");
});

test("reports invalid note tokens and unclosed groups", () => {
  const invalid = parseNotationLine("1 8 3");
  const unclosedSlur = parseNotationLine("(4 5");
  const unclosedBeam = parseNotationLine("[4 5");

  assert.ok(invalid.issues.some((issue) => issue.code === "INVALID_NOTE_DEGREE" && issue.raw === "8"));
  assert.ok(unclosedSlur.issues.some((issue) => issue.code === "UNCLOSED_SLUR_GROUP"));
  assert.ok(unclosedBeam.issues.some((issue) => issue.code === "UNCLOSED_BEAM_GROUP"));
});

test("alignment respects nested beam and slur semantics", () => {
  const slurAlignment = alignNotationAndLyric("1 2 (4 3 2) 1", "Ka sih sa yang");
  const beamAlignment = alignNotationAndLyric("[4 5]", "Ka sih");
  const beamSlurAlignment = alignNotationAndLyric("([4 5 6])", "Ka");
  const partialSlurAlignment = alignNotationAndLyric("[(4 5) 6]", "Ka sih");
  const nestedAlignment = alignNotationAndLyric("[4 (5 6)]", "Ka sih");
  const nestedBeamAlignment = alignNotationAndLyric("[4 3 [3 2]]", "I ngin i kut");
  const extensionAlignment = alignNotationAndLyric("2 . 1", "Ka sih");
  const beamExtensionAlignment = alignNotationAndLyric("[4 .]", "Ka");
  const slurExtensionAlignment = alignNotationAndLyric("(4 . 5)", "Ka");
  const partialExtensionAlignment = alignNotationAndLyric("[(4 .) 5]", "Ka sih");
  const slurAnchorAlignment = alignNotationAndLyric("[(5 4) 3]", "i ngin");
  const longSlurAlignment = alignNotationAndLyric("(5 4 3 4 5 3 4) 1 2 3", "u Tu han ku");
  const secondAnchorAlignment = alignNotationAndLyric("[(3 2) 1]", "me nye");
  const nestedSlurAnchorAlignment = alignNotationAndLyric("([1 . .] 1)", "lu");

  assert.equal(slurAlignment.status, "MATCH");
  assert.equal(slurAlignment.notationSlotCount, 4);

  assert.equal(beamAlignment.status, "MATCH");
  assert.equal(beamAlignment.notationSlotCount, 2);

  assert.equal(beamSlurAlignment.status, "MATCH");
  assert.equal(beamSlurAlignment.notationSlotCount, 1);

  assert.equal(partialSlurAlignment.status, "MATCH");
  assert.equal(partialSlurAlignment.notationSlotCount, 2);

  assert.equal(nestedAlignment.status, "MATCH");
  assert.equal(nestedAlignment.notationSlotCount, 2);

  assert.equal(nestedBeamAlignment.status, "MATCH");
  assert.equal(nestedBeamAlignment.notationSlotCount, 4);

  assert.equal(extensionAlignment.status, "MATCH");
  assert.equal(extensionAlignment.notationSlotCount, 2);

  assert.equal(beamExtensionAlignment.status, "MATCH");
  assert.equal(beamExtensionAlignment.notationSlotCount, 1);

  assert.equal(slurExtensionAlignment.status, "MATCH");
  assert.equal(slurExtensionAlignment.notationSlotCount, 1);

  assert.equal(partialExtensionAlignment.status, "MATCH");
  assert.equal(partialExtensionAlignment.notationSlotCount, 2);

  assert.equal(slurAnchorAlignment.status, "MATCH");
  assert.equal(slurAnchorAlignment.cells[0]?.anchorToken?.degree, "5");
  assert.equal(slurAnchorAlignment.cells[1]?.anchorToken?.degree, "3");

  assert.equal(longSlurAlignment.status, "MATCH");
  assert.equal(longSlurAlignment.cells[0]?.anchorToken?.degree, "5");
  assert.equal(longSlurAlignment.cells[1]?.anchorToken?.degree, "1");
  assert.equal(longSlurAlignment.cells[2]?.anchorToken?.degree, "2");
  assert.equal(longSlurAlignment.cells[3]?.anchorToken?.degree, "3");

  assert.equal(secondAnchorAlignment.status, "MATCH");
  assert.equal(secondAnchorAlignment.cells[0]?.anchorToken?.degree, "3");
  assert.equal(secondAnchorAlignment.cells[1]?.anchorToken?.degree, "1");

  assert.equal(nestedSlurAnchorAlignment.status, "MATCH");
  assert.equal(nestedSlurAnchorAlignment.cells[0]?.anchorToken?.degree, "1");
});
