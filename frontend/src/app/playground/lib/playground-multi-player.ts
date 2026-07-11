import { getAudioContext, closeAudioContext, playTone } from "@/lib/audio-synth";
import { mapNotationToAudioEvents } from "@/lib/notation-player-mapper";
import type { AudioEvent } from "@/lib/notation-player-mapper";
import { calculateFrequency } from "@/lib/audio-synth";
import { VoiceDefinition } from "./playground-voice";
import { ParsedLineData } from "../page";

export type MultiVoicePlaybackState = {
  isPlaying: boolean;
  activeVoices: Set<string>;
};

export type VoiceAudioData = {
  voiceId: string;
  waveform: OscillatorType;
  events: AudioEvent[];
  totalDuration: number;
};

export class MultiVoicePlayer {
  private playbackTimeout: number | null = null;
  private animationFrame: number | null = null;
  private currentVoicesRef: VoiceAudioData[] = [];
  private startTimeRef: number = 0;
  private seekOffset: number = 0;
  private startDelay = 0.1;
  private onStateChange?: (state: MultiVoicePlaybackState) => void;
  private onActiveNoteChange?: (voiceId: string, noteIndex: number | null) => void;
  private onPositionChange?: (positionSeconds: number, totalSeconds: number) => void;

  private lastEmittedNoteIndex: Record<string, number | null> = {};
  private isPlaying: boolean = false;

  // Per-voice volume control
  private voiceGainNodes: Map<string, GainNode> = new Map();
  private voiceVolumes: Map<string, number> = new Map();
  private voiceMuted: Map<string, boolean> = new Map();

  // Loop state
  private loopStart: number | null = null;
  private loopEnd: number | null = null;

  // Cached data for seek/re-scheduling
  private cachedVoices: VoiceDefinition[] = [];
  private cachedParsedLines: Record<string, ParsedLineData[]> = {};
  private cachedTempo: number = 100;
  private cachedSongKey: string = "C";
  private cachedEnabledVoices: Set<string> = new Set();
  private maxTotalDuration: number = 0;

  constructor(
    onStateChange?: (state: MultiVoicePlaybackState) => void,
    onActiveNoteChange?: (voiceId: string, noteIndex: number | null) => void,
    onPositionChange?: (positionSeconds: number, totalSeconds: number) => void
  ) {
    this.onStateChange = onStateChange;
    this.onActiveNoteChange = onActiveNoteChange;
    this.onPositionChange = onPositionChange;
  }

  stop() {
    this.isPlaying = false;
    if (this.playbackTimeout) {
      window.clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.onActiveNoteChange) {
      for (const voiceData of this.currentVoicesRef) {
        this.onActiveNoteChange(voiceData.voiceId, null);
      }
    }

    this.voiceGainNodes.clear();
    closeAudioContext();
    this.notifyState();
  }

  play(
    voices: VoiceDefinition[],
    parsedLinesPerVoice: Record<string, ParsedLineData[]>,
    tempo: number,
    songKey: string,
    enabledVoiceIds: Set<string>,
    fromPositionSeconds: number = 0
  ) {
    if (this.isPlaying) {
      this.stop();
      if (fromPositionSeconds === 0) return;
    }

    // Cache for seek
    this.cachedVoices = voices;
    this.cachedParsedLines = parsedLinesPerVoice;
    this.cachedTempo = tempo;
    this.cachedSongKey = songKey;
    this.cachedEnabledVoices = enabledVoiceIds;

    const voiceAudioDataList: VoiceAudioData[] = [];
    let maxDuration = 0;

    for (const voice of voices) {
      if (!enabledVoiceIds.has(voice.id)) continue;

      const lines = parsedLinesPerVoice[voice.id];
      if (!lines || lines.length === 0) continue;

      const allTokens = lines.flatMap(line => line.tokens);
      const events = mapNotationToAudioEvents(allTokens, tempo, songKey, calculateFrequency);

      if (events.length === 0) continue;

      const totalDuration = events[events.length - 1].startTimeSeconds + events[events.length - 1].durationSeconds;
      maxDuration = Math.max(maxDuration, totalDuration);

      voiceAudioDataList.push({
        voiceId: voice.id,
        waveform: voice.waveform,
        events,
        totalDuration,
      });
    }

    if (voiceAudioDataList.length === 0) return;

    this.maxTotalDuration = maxDuration;
    this.isPlaying = true;
    this.seekOffset = fromPositionSeconds;
    this.notifyState(enabledVoiceIds);

    const ctx = getAudioContext();
    console.log("[MultiVoicePlayer] play: ctx.state =", ctx.state);
    const startPlay = () => {
      console.log("[MultiVoicePlayer] startPlay: ctx.state =", ctx.state, "currentTime =", ctx.currentTime);
      if (!this.isPlaying) return; // In case stopped while resuming
      const now = ctx.currentTime;
      this.startTimeRef = now + this.startDelay;
      this.currentVoicesRef = voiceAudioDataList;

      const activeVoiceCount = voiceAudioDataList.length;
      const baseVolume = activeVoiceCount > 1 ? 0.3 / Math.sqrt(activeVoiceCount) : 0.5;

      // Create per-voice GainNodes and schedule notes
      this.voiceGainNodes.clear();
      for (const voiceData of voiceAudioDataList) {
        const voiceGain = ctx.createGain();
        const userVolume = this.voiceVolumes.get(voiceData.voiceId) ?? 1.0;
        const isMuted = this.voiceMuted.get(voiceData.voiceId) ?? false;
        voiceGain.gain.value = isMuted ? 0 : userVolume;
        voiceGain.connect(ctx.destination);
        this.voiceGainNodes.set(voiceData.voiceId, voiceGain);

        for (const event of voiceData.events) {
          const eventEnd = event.startTimeSeconds + event.durationSeconds;

          // Skip events that ended before seek position
          if (eventEnd <= fromPositionSeconds) continue;

          let schedStart = event.startTimeSeconds - fromPositionSeconds;
          let schedDuration = event.durationSeconds;

          // Handle events that overlap the seek point
          if (schedStart < 0) {
            schedDuration += schedStart;
            schedStart = 0;
          }

          if (schedDuration <= 0) continue;

          playTone(
            ctx,
            event.frequency,
            this.startTimeRef + schedStart,
            schedDuration,
            event.isSlur,
            voiceData.waveform,
            baseVolume,
            voiceGain
          );
        }
      }

      // Determine effective end for loop or full stop
      const effectiveEnd = this.loopEnd !== null ? Math.min(this.loopEnd, maxDuration) : maxDuration;
      const timeUntilEnd = effectiveEnd - fromPositionSeconds;

      this.playbackTimeout = window.setTimeout(() => {
        if (this.loopStart !== null && this.loopEnd !== null) {
          this.seekTo(this.loopStart);
          return;
        }
        this.stop();
      }, (this.startDelay + Math.max(0, timeUntilEnd)) * 1000);

      // Highlighting + position tracking loop
      const checkTime = () => {
        if (!this.isPlaying) return;

        const currentCtx = getAudioContext();
        const localElapsed = currentCtx.currentTime - this.startTimeRef;
        const timeElapsed = localElapsed + this.seekOffset;

        // Report position
        this.onPositionChange?.(timeElapsed, this.maxTotalDuration);

        // Check loop boundary
        if (this.loopEnd !== null && timeElapsed >= this.loopEnd) {
          this.seekTo(this.loopStart ?? 0);
          return;
        }

        if (localElapsed >= 0) {
          for (const voiceData of this.currentVoicesRef) {
            let currentActiveIndex: number | null = null;

          const activeEvent = voiceData.events.find(
            e => timeElapsed >= e.startTimeSeconds && timeElapsed < (e.startTimeSeconds + e.durationSeconds)
          );

          if (activeEvent) {
            const activeUiToken = activeEvent.uiTokens.find(
              ui => timeElapsed >= ui.startTimeSeconds && timeElapsed < (ui.startTimeSeconds + ui.durationSeconds)
            );

            if (activeUiToken && activeUiToken.noteIndex !== undefined) {
              currentActiveIndex = activeUiToken.noteIndex;
            }
          }

          if (this.lastEmittedNoteIndex[voiceData.voiceId] !== currentActiveIndex) {
            this.lastEmittedNoteIndex[voiceData.voiceId] = currentActiveIndex;
            this.onActiveNoteChange?.(voiceData.voiceId, currentActiveIndex);
          }
        }
      }

      this.animationFrame = requestAnimationFrame(checkTime);
    };

    this.animationFrame = requestAnimationFrame(checkTime);
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(startPlay);
  } else {
    startPlay();
  }
}

  // --- Pre-compute events (for click-to-seek before first play) ---

  ensureEventsReady(
    voices: VoiceDefinition[],
    parsedLinesPerVoice: Record<string, ParsedLineData[]>,
    tempo: number,
    songKey: string,
    enabledVoiceIds: Set<string>
  ) {
    if (this.currentVoicesRef.length > 0) return;

    this.cachedVoices = voices;
    this.cachedParsedLines = parsedLinesPerVoice;
    this.cachedTempo = tempo;
    this.cachedSongKey = songKey;
    this.cachedEnabledVoices = enabledVoiceIds;

    const voiceAudioDataList: VoiceAudioData[] = [];
    let maxDuration = 0;

    for (const voice of voices) {
      if (!enabledVoiceIds.has(voice.id)) continue;
      const lines = parsedLinesPerVoice[voice.id];
      if (!lines || lines.length === 0) continue;
      const allTokens = lines.flatMap(line => line.tokens);
      const events = mapNotationToAudioEvents(allTokens, tempo, songKey, calculateFrequency);
      if (events.length === 0) continue;
      const totalDuration = events[events.length - 1].startTimeSeconds + events[events.length - 1].durationSeconds;
      maxDuration = Math.max(maxDuration, totalDuration);
      voiceAudioDataList.push({ voiceId: voice.id, waveform: voice.waveform, events, totalDuration });
    }

    this.currentVoicesRef = voiceAudioDataList;
    this.maxTotalDuration = maxDuration;
  }

  // --- Seek ---

  seekTo(positionSeconds: number) {
    if (this.cachedVoices.length === 0) return;
    const pos = Math.max(0, Math.min(positionSeconds, this.maxTotalDuration));
    this.stop();
    this.play(
      this.cachedVoices,
      this.cachedParsedLines,
      this.cachedTempo,
      this.cachedSongKey,
      this.cachedEnabledVoices,
      pos
    );
  }

  // --- Loop ---

  setLoopRange(startSeconds: number, endSeconds: number) {
    this.loopStart = startSeconds;
    this.loopEnd = endSeconds;
  }

  clearLoop() {
    this.loopStart = null;
    this.loopEnd = null;
  }

  getLoopRange(): { start: number | null; end: number | null } {
    return { start: this.loopStart, end: this.loopEnd };
  }

  // --- Per-voice volume ---

  setVoiceVolume(voiceId: string, volume: number) {
    const clamped = Math.min(1, Math.max(0, volume));
    this.voiceVolumes.set(voiceId, clamped);
    const gainNode = this.voiceGainNodes.get(voiceId);
    if (gainNode) {
      const isMuted = this.voiceMuted.get(voiceId) ?? false;
      if (!isMuted) {
        const ctx = getAudioContext();
        gainNode.gain.linearRampToValueAtTime(clamped, ctx.currentTime + 0.05);
      }
    }
  }

  getVoiceVolume(voiceId: string): number {
    return this.voiceVolumes.get(voiceId) ?? 1.0;
  }

  muteVoice(voiceId: string, muted: boolean) {
    this.voiceMuted.set(voiceId, muted);
    const gainNode = this.voiceGainNodes.get(voiceId);
    if (gainNode) {
      const ctx = getAudioContext();
      if (muted) {
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      } else {
        const vol = this.voiceVolumes.get(voiceId) ?? 1.0;
        gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05);
      }
    }
  }

  isVoiceMuted(voiceId: string): boolean {
    return this.voiceMuted.get(voiceId) ?? false;
  }

  soloVoice(voiceId: string) {
    for (const vd of this.currentVoicesRef) {
      this.muteVoice(vd.voiceId, vd.voiceId !== voiceId);
    }
  }

  unsoloAll() {
    for (const vd of this.currentVoicesRef) {
      this.muteVoice(vd.voiceId, false);
    }
  }

  // --- Position ---

  getCurrentPosition(): number {
    if (!this.isPlaying) return 0;
    try {
      const ctx = getAudioContext();
      return ctx.currentTime - this.startTimeRef + this.seekOffset;
    } catch {
      return 0;
    }
  }

  getTotalDuration(): number {
    return this.maxTotalDuration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Given a globalNoteIndex, find the time position for that note
   * across all voices. Returns the earliest match.
   */
  getTimeForNoteIndex(noteIndex: number): number | null {
    for (const voiceData of this.currentVoicesRef) {
      for (const event of voiceData.events) {
        const match = event.uiTokens.find(ui => ui.noteIndex === noteIndex);
        if (match) return match.startTimeSeconds;
      }
    }
    return null;
  }

  private notifyState(activeVoices: Set<string> = new Set()) {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        activeVoices: activeVoices,
      });
    }
  }
}
