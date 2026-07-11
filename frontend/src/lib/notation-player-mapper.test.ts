import assert from "node:assert/strict";
import test from "node:test";
import { parseNotationLine } from "./notation-parser";
import { mapNotationToAudioEvents } from "./notation-player-mapper";
import { calculateFrequency } from "./audio-synth";

test("maps basic notation tokens to audio events", () => {
  const parsed = parseNotationLine("1 2 3 5");
  const events = mapNotationToAudioEvents(parsed.tokens, 60, "C", calculateFrequency);

  assert.equal(events.length, 4);
  
  // 1 beat at 60 BPM = 1 second
  assert.equal(events[0].durationSeconds, 1);
  assert.equal(events[0].startTimeSeconds, 0);
  assert.equal(events[0].isSlur, false);
  
  // C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.00
  assert.ok(Math.abs(events[0].frequency - 261.63) < 0.1);
  assert.ok(Math.abs(events[1].frequency - 293.66) < 0.1);
  assert.ok(Math.abs(events[2].frequency - 329.63) < 0.1);
  assert.ok(Math.abs(events[3].frequency - 392.00) < 0.1);
});

test("handles short durations (slashes)", () => {
  const parsed = parseNotationLine("1/ 1//");
  // 120 BPM = 0.5s per beat
  const events = mapNotationToAudioEvents(parsed.tokens, 120, "C", calculateFrequency);

  assert.equal(events.length, 2);
  
  // 1/ = 0.5 beat = 0.25 seconds (since 1 beat is 0.5s)
  assert.equal(events[0].durationSeconds, 0.25);
  // 1// = 0.25 beat = 0.125 seconds
  assert.equal(events[1].durationSeconds, 0.125);
  assert.equal(events[1].startTimeSeconds, 0.25);
});

test("handles beamed durations", () => {
  const parsed = parseNotationLine("[1 2]");
  // 60 BPM = 1s per beat
  const events = mapNotationToAudioEvents(parsed.tokens, 60, "C", calculateFrequency);

  assert.equal(events.length, 2);
  
  // Beam halves duration: 1/2 beat = 0.5 seconds
  assert.equal(events[0].durationSeconds, 0.5);
  assert.equal(events[1].durationSeconds, 0.5);
  assert.equal(events[1].startTimeSeconds, 0.5);
});

test("handles holds (dashes) and extensions (dots)", () => {
  const parsed = parseNotationLine("1- 1.");
  const events = mapNotationToAudioEvents(parsed.tokens, 60, "C", calculateFrequency);

  assert.equal(events.length, 2);
  
  // 1- = 2 beats = 2 seconds
  assert.equal(events[0].durationSeconds, 2);
  
  // 1. = 1 + 0.5 = 1.5 beats = 1.5 seconds
  assert.equal(events[1].durationSeconds, 1.5);
  assert.equal(events[1].startTimeSeconds, 2);
});

test("handles slurs", () => {
  const parsed = parseNotationLine("(1 2)");
  const events = mapNotationToAudioEvents(parsed.tokens, 60, "C", calculateFrequency);

  assert.equal(events.length, 2);
  
  assert.equal(events[0].isSlur, true); // Slurs into next note
  assert.equal(events[1].isSlur, false); // End of slur group
});

test("handles rest notes", () => {
  const parsed = parseNotationLine("1 0 1");
  const events = mapNotationToAudioEvents(parsed.tokens, 60, "C", calculateFrequency);

  assert.equal(events.length, 3);
  
  assert.equal(events[1].frequency, 0); // Rest should have 0 freq
  assert.equal(events[1].durationSeconds, 1);
  assert.equal(events[2].startTimeSeconds, 2); // Third note starts after rest
});

test("handles key signatures correctly", () => {
  const parsed = parseNotationLine("1 1");
  
  const eventsC = mapNotationToAudioEvents(parsed.tokens, 60, "C", calculateFrequency);
  const eventsD = mapNotationToAudioEvents(parsed.tokens, 60, "D", calculateFrequency);

  assert.ok(eventsC[0].frequency < eventsD[0].frequency);
  
  // D is 2 semitones above C
  const ratio = eventsD[0].frequency / eventsC[0].frequency;
  // 2^(2/12) ≈ 1.12246
  assert.ok(Math.abs(ratio - 1.12246) < 0.001);
});
