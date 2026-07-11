const parser = require("./src/lib/notation-parser.ts");
const lyric = require("./src/lib/lyric-parser.ts");
const notationTokens = parser.collectLyricSlotTokens(parser.parseNotationLine("3 [3 [. 4]] 5  ([1' [. 6]]) | 5 .  .  ([5 [. 4]]) | 2 2 2 ([6 [. 5]]) | 3 .  . 0 |").tokens);
const lyricSyllables = lyric.parseLyricSyllables("Ho si pa ngo lu au, sai to pot ma au on.");
const cells = notationTokens.map(tok => ({ notationToken: tok, lyric: null }));
const slotClaims = new Map();
for (const syllable of lyricSyllables) {
  let bestSlot = -1, bestDist = Infinity;
  for (let i = 0; i < notationTokens.length; i++) {
    const dist = Math.abs(notationTokens[i].index - syllable.startIndex);
    if (dist < bestDist) { bestDist = dist; bestSlot = i; }
  }
  if (bestSlot !== -1) {
    const existing = slotClaims.get(bestSlot);
    if (!existing || bestDist < existing.distance) slotClaims.set(bestSlot, { syllable, distance: bestDist });
  }
}
for (const [slotIndex, claim] of slotClaims) cells[slotIndex].lyric = claim.syllable;
console.log("CELLS:", cells.map(c => c.lyric ? c.lyric.text : "NULL"));
