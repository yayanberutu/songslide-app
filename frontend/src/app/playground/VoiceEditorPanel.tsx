"use client";

import React from "react";
import { VoiceDefinition, AVAILABLE_WAVEFORMS, VOICE_COLORS, getVoiceBgColorClass, getVoiceColorClass } from "./lib/playground-voice";

interface VoiceEditorPanelProps {
  voices: VoiceDefinition[];
  notationByVoice: Record<string, string>;
  lyricByVoice: Record<string, string>;
  enabledVoices: Set<string>;
  onVoiceChange: (voiceId: string, updates: Partial<VoiceDefinition>) => void;
  onVoiceDelete: (voiceId: string) => void;
  onNotationChange: (voiceId: string, value: string) => void;
  onLyricChange: (voiceId: string, value: string) => void;
  onToggleVoiceEnabled: (voiceId: string) => void;
}

export function VoiceEditorPanel({
  voices,
  notationByVoice,
  lyricByVoice,
  enabledVoices,
  onVoiceChange,
  onVoiceDelete,
  onNotationChange,
  onLyricChange,
  onToggleVoiceEnabled
}: VoiceEditorPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Global Controls */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <span className="text-sm font-medium text-slate-700">Mainkan:</span>
        <div className="flex flex-wrap gap-3">
          {voices.map(voice => (
            <label key={`play-${voice.id}`} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enabledVoices.has(voice.id)}
                onChange={() => onToggleVoiceEnabled(voice.id)}
                className={`w-4 h-4 rounded border-slate-300 focus:ring-2 focus:ring-offset-1 ${
                  enabledVoices.has(voice.id) ? getVoiceColorClass(voice.color).replace("text-", "text-") : ""
                }`}
              />
              <span className="text-sm text-slate-700">{voice.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Voice Editors */}
      <div className="flex flex-col gap-4">
        {voices.map((voice) => {
          const bgClass = getVoiceBgColorClass(voice.color);
          const colorClass = getVoiceColorClass(voice.color);
          
          return (
            <div key={voice.id} className={`flex flex-col gap-3 p-4 rounded-xl border ${bgClass} bg-opacity-30`}>
              {/* Header: Label, Waveform, Color, Delete */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-current ${colorClass}`} />
                  <input
                    type="text"
                    value={voice.label}
                    onChange={(e) => onVoiceChange(voice.id, { label: e.target.value })}
                    className="font-semibold bg-transparent border-b border-transparent focus:border-current focus:outline-none px-1 py-0.5"
                    placeholder="Nama Suara"
                  />
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <span className="opacity-80">Waveform:</span>
                    <select
                      value={voice.waveform}
                      onChange={(e) => onVoiceChange(voice.id, { waveform: e.target.value as OscillatorType })}
                      className="bg-white/50 border border-black/10 rounded px-2 py-1 focus:outline-none"
                    >
                      {AVAILABLE_WAVEFORMS.map(wf => (
                        <option key={wf} value={wf}>{wf}</option>
                      ))}
                    </select>
                  </label>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-80">Warna:</span>
                    <div className="flex gap-1">
                      {VOICE_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => onVoiceChange(voice.id, { color })}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            voice.color === color 
                              ? "border-slate-800 scale-110" 
                              : "border-transparent hover:scale-110 opacity-70 hover:opacity-100"
                          } ${getVoiceBgColorClass(color).split(" ")[0]}`}
                          aria-label={`Pilih warna ${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  {voices.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Hapus suara ${voice.label}?`)) {
                          onVoiceDelete(voice.id);
                        }
                      }}
                      className="p-1.5 text-red-600/70 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Hapus Suara"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Textareas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium opacity-80 uppercase tracking-wider">Notasi Angka</label>
                  <textarea
                    className="w-full h-32 p-3 font-mono text-sm border border-black/10 rounded-lg shadow-sm focus:ring-2 focus:ring-black/20 focus:border-black/30 bg-white/80"
                    placeholder={`Ketik notasi untuk ${voice.label}...`}
                    value={notationByVoice[voice.id] || ""}
                    onChange={(e) => onNotationChange(voice.id, e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium opacity-80 uppercase tracking-wider">Lirik</label>
                  <textarea
                    className="w-full h-32 p-3 text-sm border border-black/10 rounded-lg shadow-sm focus:ring-2 focus:ring-black/20 focus:border-black/30 bg-white/80"
                    placeholder={`Ketik lirik untuk ${voice.label}...`}
                    value={lyricByVoice[voice.id] || ""}
                    onChange={(e) => onLyricChange(voice.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
