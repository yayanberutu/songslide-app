import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectLyricSlotTokens,
  countNotationLyricSlots,
  parseLyricSyllables,
  parseNotationLine,
  renderNotationLineSvg,
  resolveLyricAnchor
} from "../src/notation-renderer";

describe("notation renderer", () => {
  it("parses octave, duration, hold, bar, rest, and extension tokens", () => {
    const parsed = parseNotationLine("1' 1, 1/ 1// 1- | 0 .");

    assert.equal(parsed.issues.length, 0);
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
    assert.equal(parsed.tokens[5]?.type, "BAR");
    assert.equal(parsed.tokens[6]?.type, "REST");
    assert.equal(parsed.tokens[7]?.type, "EXTENSION");
  });

  it("keeps lyric slot counts for beam and slur groups", () => {
    assert.equal(countNotationLyricSlots(parseNotationLine("[(5 4) 3]").tokens), 2);
    assert.equal(countNotationLyricSlots(parseNotationLine("([1 . .] 1)").tokens), 1);
    assert.equal(countNotationLyricSlots(parseNotationLine("[5 [6 5]]").tokens), 3);
  });

  it("anchors slur-group slots to the first visible note", () => {
    const grouped = collectLyricSlotTokens(parseNotationLine("[(5 4) 3]").tokens);
    const longSlur = collectLyricSlotTokens(parseNotationLine("(5 4 3 4 5 3 4) 1 2 3").tokens);
    const nested = collectLyricSlotTokens(parseNotationLine("([1 . .] 1)").tokens);

    assert.equal(resolveLyricAnchor(grouped[0])?.degree, "5");
    assert.equal(resolveLyricAnchor(grouped[1])?.degree, "3");
    assert.equal(resolveLyricAnchor(longSlur[0])?.degree, "5");
    assert.equal(resolveLyricAnchor(longSlur[1])?.degree, "1");
    assert.equal(resolveLyricAnchor(nested[0])?.degree, "1");
  });

  it("renders svg markup with notation decorations and lyric anchors", () => {
    const rendered = renderNotationLineSvg({
      notation: "[3] | [(5 4) 3] | [(3 2) 1] [1 . .] [7 . 2] | ([1 . .] 1)",
      lyric: "Ku i ngin me nye rah kan se lu",
      theme: {
        notationText: "1F2937",
        lyricText: "111827"
      }
    });

    assert.equal(rendered.issues.length, 0);
    assert.ok(rendered.svg.includes("<svg"));
    assert.ok(rendered.svg.includes("<line"));
    assert.ok(rendered.svg.includes("<path"));
    assert.ok(rendered.svg.includes("Ku"));
    assert.ok(rendered.width > 0);
    assert.ok(rendered.height > 0);
    assert.ok(rendered.slotAnchors.length >= parseLyricSyllables("Ku i ngin me nye rah kan se lu").length - 1);
  });
});
