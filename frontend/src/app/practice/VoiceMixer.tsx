"use client";

import React from "react";
import { VoiceDefinition, getVoiceColorClass } from "@/app/playground/lib/playground-voice";

interface VoiceMixerProps {
  voices: VoiceDefinition[];
  volumes: Record<string, number>;
  mutedVoices: Set<string>;
  soloVoice: string | null;
  onVolumeChange: (voiceId: string, volume: number) => void;
  onMuteToggle: (voiceId: string) => void;
  onSoloToggle: (voiceId: string) => void;
  onResetAll: () => void;
}

export function VoiceMixer({
  voices,
  volumes,
  mutedVoices,
  soloVoice,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onResetAll,
}: VoiceMixerProps) {
  if (voices.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-700">Volume Suara</h3>
        <button
          onClick={onResetAll}
          className="text-xs font-medium px-3 py-1 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {voices.map((v) => {
          const vol = volumes[v.id] ?? 1.0;
          const isMuted = mutedVoices.has(v.id);
          const isSolo = soloVoice === v.id;
          const colorClass = getVoiceColorClass(v.color);

          return (
            <div key={v.id} className="flex items-center gap-2 sm:gap-3">
              <span className={`text-[10px] sm:text-xs font-semibold w-12 sm:w-14 truncate ${colorClass}`}>
                {v.label}
              </span>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(vol * 100)}
                onChange={(e) => onVolumeChange(v.id, parseInt(e.target.value) / 100)}
                className="flex-1 h-1.5 accent-emerald-500"
                disabled={isMuted}
              />

              <span className="text-xs text-slate-500 w-8 text-right">
                {isMuted ? "—" : `${Math.round(vol * 100)}%`}
              </span>

              <button
                onClick={() => onMuteToggle(v.id)}
                className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                  isMuted
                    ? "bg-red-100 text-red-600"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? "M" : "M"}
              </button>

              <button
                onClick={() => onSoloToggle(v.id)}
                className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                  isSolo
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                title={isSolo ? "Unsolo" : "Solo"}
              >
                S
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
