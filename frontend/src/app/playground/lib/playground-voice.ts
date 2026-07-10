export type VoiceDefinition = {
  id: string;
  label: string;
  waveform: OscillatorType;
  color: string;
};

export const AVAILABLE_WAVEFORMS: OscillatorType[] = [
  "sine",
  "triangle",
  "square",
  "sawtooth",
];

// Tailwind color classes for voices
export const VOICE_COLORS = [
  "emerald",
  "blue",
  "orange",
  "red",
  "purple",
  "indigo",
  "pink",
  "teal",
];

export const DEFAULT_VOICES: VoiceDefinition[] = [
  { id: "sopran", label: "Sopran", waveform: "sine", color: "emerald" },
  { id: "alto", label: "Alto", waveform: "triangle", color: "blue" },
  { id: "tenor", label: "Tenor", waveform: "square", color: "orange" },
  { id: "bass", label: "Bass", waveform: "sawtooth", color: "red" },
];

export function createVoice(id: string, label: string, index: number): VoiceDefinition {
  const color = VOICE_COLORS[index % VOICE_COLORS.length];
  const waveform = AVAILABLE_WAVEFORMS[index % AVAILABLE_WAVEFORMS.length];
  return { id, label, waveform, color };
}

export function getVoiceColorClass(color: string): string {
  // Return safe tailwind classes. In NextJS/Tailwind, we need to ensure these exist
  // or are mapped correctly if dynamically constructed. For playground, we can use specific maps.
  const map: Record<string, string> = {
    emerald: "text-emerald-500",
    blue: "text-blue-500",
    orange: "text-orange-500",
    red: "text-red-500",
    purple: "text-purple-500",
    indigo: "text-indigo-500",
    pink: "text-pink-500",
    teal: "text-teal-500",
  };
  return map[color] || "text-slate-800";
}

export function getVoiceBgColorClass(color: string): string {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    pink: "bg-pink-50 text-pink-700 border-pink-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
  };
  return map[color] || "bg-slate-50 text-slate-700 border-slate-200";
}

export function getVoiceButtonColorClass(color: string): string {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30",
    blue: "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30",
    orange: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30",
    red: "bg-red-500 hover:bg-red-600 shadow-red-500/30",
    purple: "bg-purple-500 hover:bg-purple-600 shadow-purple-500/30",
    indigo: "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30",
    pink: "bg-pink-500 hover:bg-pink-600 shadow-pink-500/30",
    teal: "bg-teal-500 hover:bg-teal-600 shadow-teal-500/30",
  };
  return map[color] || "bg-slate-500 hover:bg-slate-600 shadow-slate-500/30";
}
