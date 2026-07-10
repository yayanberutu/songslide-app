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
  private startDelay = 0.1;
  private onStateChange?: (state: MultiVoicePlaybackState) => void;
  private onActiveNoteChange?: (voiceId: string, noteIndex: number | null) => void;
  private isPlaying: boolean = false;

  constructor(
    onStateChange?: (state: MultiVoicePlaybackState) => void,
    onActiveNoteChange?: (voiceId: string, noteIndex: number | null) => void
  ) {
    this.onStateChange = onStateChange;
    this.onActiveNoteChange = onActiveNoteChange;
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
    
    // Clear highlights for all voices
    if (this.onActiveNoteChange) {
      for (const voiceData of this.currentVoicesRef) {
        this.onActiveNoteChange(voiceData.voiceId, null);
      }
    }
    
    closeAudioContext();
    this.notifyState();
  }

  play(
    voices: VoiceDefinition[],
    parsedLinesPerVoice: Record<string, ParsedLineData[]>,
    tempo: number,
    songKey: string,
    enabledVoiceIds: Set<string>
  ) {
    if (this.isPlaying) {
      this.stop();
      return;
    }

    const voiceAudioDataList: VoiceAudioData[] = [];
    let maxTotalDuration = 0;

    // Prepare events for each enabled voice
    for (const voice of voices) {
      if (!enabledVoiceIds.has(voice.id)) continue;
      
      const lines = parsedLinesPerVoice[voice.id];
      if (!lines || lines.length === 0) continue;

      const allTokens = lines.flatMap(line => line.tokens);
      const events = mapNotationToAudioEvents(allTokens, tempo, songKey, calculateFrequency);
      
      if (events.length === 0) continue;

      const totalDuration = events.length > 0 
        ? events[events.length - 1].startTimeSeconds + events[events.length - 1].durationSeconds
        : 0;
        
      maxTotalDuration = Math.max(maxTotalDuration, totalDuration);

      voiceAudioDataList.push({
        voiceId: voice.id,
        waveform: voice.waveform,
        events,
        totalDuration,
      });
    }

    if (voiceAudioDataList.length === 0) return;

    this.isPlaying = true;
    this.notifyState(enabledVoiceIds);

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    this.startTimeRef = now + this.startDelay;
    this.currentVoicesRef = voiceAudioDataList;

    // Play all voices
    const activeVoiceCount = voiceAudioDataList.length;
    // Reduce volume slightly when multiple voices play to avoid clipping
    const volume = activeVoiceCount > 1 ? 0.3 / Math.sqrt(activeVoiceCount) : 0.5;

    for (const voiceData of voiceAudioDataList) {
      voiceData.events.forEach(event => {
        playTone(
          ctx,
          event.frequency,
          this.startTimeRef + event.startTimeSeconds,
          event.durationSeconds,
          event.isSlur,
          voiceData.waveform,
          volume
        );
      });
    }

    // Schedule stop state update
    this.playbackTimeout = window.setTimeout(() => {
      this.stop();
    }, (this.startDelay + maxTotalDuration) * 1000);

    // Start requestAnimationFrame loop for highlighting
    const checkTime = () => {
      const currentCtx = getAudioContext();
      const timeElapsed = currentCtx.currentTime - this.startTimeRef;
      
      if (timeElapsed >= 0) {
        // Find which event is currently playing for each voice
        for (const voiceData of this.currentVoicesRef) {
          const activeEvent = voiceData.events.find(
            e => timeElapsed >= e.startTimeSeconds && timeElapsed < (e.startTimeSeconds + e.durationSeconds)
          );
          
          if (activeEvent) {
            // Find the specific UI token within this event
            const activeUiToken = activeEvent.uiTokens.find(
              ui => timeElapsed >= ui.startTimeSeconds && timeElapsed < (ui.startTimeSeconds + ui.durationSeconds)
            );
            
            if (activeUiToken && activeUiToken.noteIndex !== undefined) {
              this.onActiveNoteChange?.(voiceData.voiceId, activeUiToken.noteIndex);
            }
          }
        }
      }
      
      this.animationFrame = requestAnimationFrame(checkTime);
    };
    
    this.animationFrame = requestAnimationFrame(checkTime);
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
