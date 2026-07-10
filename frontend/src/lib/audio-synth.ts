export type AudioContextRef = {
  ctx: AudioContext | null;
};

export const audioState: AudioContextRef = {
  ctx: null
};

export function getAudioContext(): AudioContext {
  if (!audioState.ctx) {
    audioState.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioState.ctx;
}

export function closeAudioContext() {
  if (audioState.ctx) {
    audioState.ctx.close();
    audioState.ctx = null;
  }
}

// Maps degree 1-7 to semitone offset from root
const majorScaleOffsets: Record<string, number> = {
  "1": 0,
  "2": 2,
  "3": 4,
  "4": 5,
  "5": 7,
  "6": 9,
  "7": 11
};

// Maps key signature to its base semitone offset relative to C4 (Middle C)
const keyBaseOffsets: Record<string, number> = {
  "Cb": -1, "C": 0, "C#": 1, "Db": 1,
  "D": 2, "D#": 3, "Eb": 3,
  "E": 4, "F": 5, "F#": 6, "Gb": 6,
  "G": -5, "G#": -4, "Ab": -4, // Often G/A/B are lower than middle C for better range in singing
  "A": -3, "A#": -2, "Bb": -2,
  "B": -1
};

/**
 * Calculates the frequency of a Jianpu note.
 * @param key Signature (e.g. "C", "F#")
 * @param degree Note degree (1-7)
 * @param octave Octave offset (-1, 0, 1...)
 * @param accidental "#" or "b" or undefined
 */
export function calculateFrequency(
  key: string,
  degree: string,
  octave: number,
  accidental?: "#" | "b"
): number {
  if (degree === "0") return 0; // Rest

  // Base is C4 (middle C) = 261.63Hz
  // A4 = 440Hz -> C4 is 9 semitones below A4 -> 440 * 2^(-9/12)
  const baseKeyOffset = keyBaseOffsets[key] ?? 0;
  const degreeOffset = majorScaleOffsets[degree] ?? 0;
  let accidentalOffset = 0;
  if (accidental === "#") accidentalOffset = 1;
  if (accidental === "b") accidentalOffset = -1;
  
  // Total semitones from C4
  const semitonesFromC4 = baseKeyOffset + degreeOffset + accidentalOffset + (octave * 12);
  
  // Frequency formula: f = f0 * 2^(n/12), where f0 is C4 (261.63 Hz)
  const C4_FREQ = 261.625565;
  return C4_FREQ * Math.pow(2, semitonesFromC4 / 12);
}

/**
 * Plays a single tone.
 */
export function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  isSlur: boolean = false,
  waveform: OscillatorType = "sine",
  volume: number = 0.5
) {
  if (frequency === 0) return; // Rest

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveform;
  osc.frequency.setValueAtTime(frequency, startTime);

  // Attack/Release envelope to avoid clicks
  const attackTime = 0.02;
  const releaseTime = isSlur ? 0.01 : 0.05; // Shorter release for slurred notes

  // Ensure times are safe
  const safeDuration = Math.max(duration, attackTime + releaseTime + 0.01);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
  
  // Keep volume constant
  gain.gain.setValueAtTime(volume, startTime + safeDuration - releaseTime);
  // Fade out
  gain.gain.linearRampToValueAtTime(0, startTime + safeDuration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + safeDuration);
}
