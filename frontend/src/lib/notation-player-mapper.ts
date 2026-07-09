import { NotationToken, NotationNoteToken, NotationRestToken, NotationGroupChildToken } from "./notation-parser";

export type AudioEvent = {
  frequency: number;
  durationSeconds: number;
  startTimeSeconds: number;
  isSlur: boolean; // True if this note slurs into the next note
  uiTokens: { noteIndex?: number; startTimeSeconds: number; durationSeconds: number }[];
};

type FlattenedAudioNote = {
  token: NotationNoteToken | NotationRestToken;
  beamDepth: number;
  slurDepth: number;
  extensionBeamDepths: number[];
  globalNoteIndex?: number;
};

/**
 * Flattens the nested token structure into a linear sequence of notes/rests
 * with their accumulated beam and slur depths.
 */
function flattenTokens(
  tokens: readonly NotationToken[] | readonly NotationGroupChildToken[],
  result: FlattenedAudioNote[] = [],
  beamDepth = 0,
  slurDepth = 0
): FlattenedAudioNote[] {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "NOTE" || token.type === "REST") {
      result.push({
        token,
        beamDepth,
        slurDepth,
        extensions: [],
        globalNoteIndex: token.globalNoteIndex
      });
    } else if (token.type === "BEAM") {
      flattenTokens(token.children, result, beamDepth + 1, slurDepth);
    } else if (token.type === "SLUR") {
      flattenTokens(token.children, result, beamDepth, slurDepth + 1);
    } else if (token.type === "EXTENSION") {
      // Attach the extension dot to the most recently added note/rest
      if (result.length > 0) {
        result[result.length - 1].extensions.push({ beamDepth, globalNoteIndex: token.globalNoteIndex });
      } else {
        // If there is no previous note to extend, treat the dot as a rest
        result.push({
          token: {
            type: "REST",
            raw: token.raw,
            index: token.index,
            lyricSlots: 0,
            hasFermata: token.hasFermata,
            globalNoteIndex: token.globalNoteIndex
          },
          beamDepth,
          slurDepth,
          extensions: [],
          globalNoteIndex: token.globalNoteIndex
        });
      }
    }
    // Ignore BAR and DOUBLE_BAR for audio timing
  }

  return result;
}

/**
 * Maps a sequence of NotationTokens into a sequence of playable AudioEvents.
 * @param tokens The parsed tokens
 * @param tempo Beats per minute (e.g., 60 = 1 beat per second)
 * @param key Signature (e.g., "C", "D#")
 * @param calculateFrequencyFn Function to calculate frequency
 */
export function mapNotationToAudioEvents(
  tokens: readonly NotationToken[],
  tempo: number,
  key: string,
  calculateFrequencyFn: (key: string, degree: string, octave: number, accidental?: "#" | "b") => number
): AudioEvent[] {
  const flatNotes = flattenTokens(tokens);
  
  // 1 beat = 60 / tempo seconds
  // Default tempo fallback if invalid
  const safeTempo = tempo > 0 ? tempo : 100;
  const beatDuration = 60 / safeTempo;
  
  const events: AudioEvent[] = [];
  let currentTime = 0;

  for (let i = 0; i < flatNotes.length; i++) {
    const flatNote = flatNotes[i];
    const token = flatNote.token;
    
    // Calculate base duration in beats
    // shortDurationLevel = explicit slashes (e.g. `1/` is 1, `1//` is 2)
    // beamDepth = implicit slashes from being inside `[...]` groups
    const explicitShortDuration = token.type === "NOTE" ? token.shortDurationLevel : 0;
    const holdCount = token.type === "NOTE" ? token.holdCount : 0;
    
    const totalShortLevel = explicitShortDuration + flatNote.beamDepth;
    
    // Base note value (1 beat halved for every short level)
    const baseNoteValue = 1 / Math.pow(2, totalShortLevel);
    
    // Total note value includes holds (dashes)
    let totalNoteValue = baseNoteValue + holdCount;
    
    // Apply extension dots (. tokens)
    // In Indonesian numerical notation (Jianpu), a dot takes up a time slot
    // equivalent to its structural position (beam depth).
    const uiTokens = [];
    uiTokens.push({
      noteIndex: flatNote.globalNoteIndex,
      startTimeSeconds: currentTime,
      durationSeconds: totalNoteValue * beatDuration
    });
    
    let extensionDuration = 0;
    let nextStartTime = currentTime + (totalNoteValue * beatDuration);

    for (const ext of flatNote.extensions) {
      const extDuration = (1 / Math.pow(2, ext.beamDepth)) * beatDuration;
      uiTokens.push({
        noteIndex: ext.globalNoteIndex,
        startTimeSeconds: nextStartTime,
        durationSeconds: extDuration
      });
      nextStartTime += extDuration;
      extensionDuration += extDuration;
    }

    if (token.hasFermata) {
      for (const ui of uiTokens) {
        ui.durationSeconds *= 1.5;
        ui.startTimeSeconds = currentTime + ((ui.startTimeSeconds - currentTime) * 1.5);
      }
      totalNoteValue *= 1.5;
      extensionDuration *= 1.5;
    }

    const durationSeconds = (totalNoteValue * beatDuration) + extensionDuration;

    if (token.type === "NOTE") {
      const frequency = calculateFrequencyFn(key, token.degree, token.octave, token.accidental);
      
      const isSlur = flatNote.slurDepth > 0 && i < flatNotes.length - 1 && flatNotes[i + 1].slurDepth > 0;

      events.push({
        frequency,
        durationSeconds,
        startTimeSeconds: currentTime,
        isSlur,
        uiTokens
      });
    } else if (token.type === "REST") {
      events.push({
        frequency: 0,
        durationSeconds,
        startTimeSeconds: currentTime,
        isSlur: false,
        uiTokens
      });
    }

    currentTime += durationSeconds;
  }

  return events;
}
