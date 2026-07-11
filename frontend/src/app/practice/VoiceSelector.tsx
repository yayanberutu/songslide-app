"use client";

import React, { useEffect } from "react";
import { VoiceDefinition, getVoiceBgColorClass } from "@/app/playground/lib/playground-voice";

const STORAGE_KEY = "songslide-practice-view";

interface ViewModeSelectorProps {
  voices: VoiceDefinition[];
  selectedMode: string;
  onModeChange: (mode: string) => void;
}

export function ViewModeSelector({ voices, selectedMode, onModeChange }: ViewModeSelectorProps) {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "all" || (stored && voices.some((v) => v.id === stored))) {
      onModeChange(stored);
    }
  }, [voices, onModeChange]);

  const handleSelect = (mode: string) => {
    onModeChange(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  if (voices.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <label className="font-semibold text-slate-800">Tampilan</label>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          onClick={() => handleSelect("all")}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all border-2 ${
            selectedMode === "all"
              ? "bg-emerald-500 text-white border-emerald-500 scale-105 shadow-md"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          Semua Suara
        </button>
        {voices.map((v) => {
          const isSelected = v.id === selectedMode;
          const bgClass = getVoiceBgColorClass(v.color);
          return (
            <button
              key={v.id}
              onClick={() => handleSelect(v.id)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all border-2 ${
                isSelected
                  ? `${bgClass} border-current scale-105 shadow-md`
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
