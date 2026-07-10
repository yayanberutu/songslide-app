"use client";

import React, { useState } from "react";
import { VoiceDefinition, getVoiceColorClass } from "./lib/playground-voice";

interface VoiceTabBarProps {
  voices: VoiceDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onAddVoice: (voice: Omit<VoiceDefinition, "id">) => void;
}

export function VoiceTabBar({ voices, activeTab, onTabChange, onAddVoice }: VoiceTabBarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    
    // We pass index = voices.length for defaults in the parent,
    // but here we just pass the label and let parent generate id/color/waveform
    onAddVoice({
      label: newLabel.trim(),
      waveform: "sine",
      color: "emerald"
    });
    setNewLabel("");
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col border-b border-slate-200 mb-6">
      <div className="flex flex-wrap items-end gap-1">
        {/* All Tab */}
        <button
          onClick={() => onTabChange("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-slate-800 text-slate-800"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Semua Suara
        </button>

        {/* Voice Tabs */}
        {voices.map((voice) => {
          const isActive = activeTab === voice.id;
          const colorClass = getVoiceColorClass(voice.color);
          
          return (
            <button
              key={voice.id}
              onClick={() => onTabChange(voice.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? `border-current ${colorClass}`
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {voice.label}
            </button>
          );
        })}

        {/* Add Button */}
        {voices.length < 8 && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-2 text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-t-md transition-colors flex items-center gap-1"
            title="Tambah Suara"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="sr-only sm:not-sr-only">Tambah</span>
          </button>
        )}
      </div>

      {/* Inline Add Form */}
      {isAdding && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          <form onSubmit={handleAddSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nama suara (cth: Sopran 2)"
              className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newLabel.trim()}
              className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded"
            >
              Batal
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
