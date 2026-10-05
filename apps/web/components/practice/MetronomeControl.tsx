"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Square,
  Sliders,
  X,
  Volume2,
  VolumeX,
  Minus,
  Plus,
  HandMetal,
} from "lucide-react";
import {
  MetronomeEngine,
  type TimeSignature,
  type MetronomeState,
} from "@/lib/audio/metronomeEngine";

export interface MetronomeControlProps {
  initialBpm?: number;
  initialTimeSignature?: TimeSignature;
  onBpmChange?: (bpm: number) => void;
  compact?: boolean;
  className?: string;
}

const TIME_SIGNATURES: TimeSignature[] = ["4/4", "3/4", "3/8", "6/8", "2/4"];

function getTempoMarking(bpm: number): string {
  if (bpm < 60) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 168) return "Allegro";
  if (bpm < 200) return "Vivace";
  return "Presto";
}

export function MetronomeControl({
  initialBpm = 120,
  initialTimeSignature = "4/4",
  onBpmChange,
  compact = false,
  className = "",
}: MetronomeControlProps) {
  const engineRef = useRef<MetronomeEngine | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [bpm, setBpm] = useState(initialBpm);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(initialTimeSignature);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);

  // Active beat for LED flashing (null = no beat flashing)
  const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const [isAccentBeat, setIsAccentBeat] = useState(false);
  const beatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tap feedback pulse state
  const [tapPulsing, setTapPulsing] = useState(false);

  // Initialize MetronomeEngine
  useEffect(() => {
    const engine = new MetronomeEngine(initialBpm, initialTimeSignature);
    engineRef.current = engine;

    engine.setCallbacks({
      onBeat: (beatNumber, isAccent) => {
        setActiveBeat(beatNumber);
        setIsAccentBeat(isAccent);
        if (beatTimerRef.current) clearTimeout(beatTimerRef.current);
        beatTimerRef.current = setTimeout(() => {
          setActiveBeat(null);
        }, 130);
      },
      onStateChange: (state: MetronomeState) => {
        setIsPlaying(state.isPlaying);
        setBpm(state.bpm);
        setTimeSignature(state.timeSignature);
        setVolume(state.volume);
      },
    });

    return () => {
      if (beatTimerRef.current) clearTimeout(beatTimerRef.current);
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync initialBpm changes from parent only when parent prop actually changes
  const prevInitialBpmRef = useRef(initialBpm);
  useEffect(() => {
    if (initialBpm !== prevInitialBpmRef.current) {
      prevInitialBpmRef.current = initialBpm;
      setBpm(initialBpm);
      engineRef.current?.setBpm(initialBpm);
    }
  }, [initialBpm]);

  // Sync initialTimeSignature changes from parent only when parent prop actually changes
  const prevInitialTimeSigRef = useRef(initialTimeSignature);
  useEffect(() => {
    if (initialTimeSignature !== prevInitialTimeSigRef.current) {
      prevInitialTimeSigRef.current = initialTimeSignature;
      setTimeSignature(initialTimeSignature);
      engineRef.current?.setTimeSignature(initialTimeSignature);
    }
  }, [initialTimeSignature]);

  // Click outside listener for settings popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleTogglePlay = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.toggle();
  }, []);

  const handleBpmChange = useCallback(
    (newBpm: number) => {
      const clamped = Math.max(30, Math.min(300, Math.round(newBpm)));
      setBpm(clamped);
      engineRef.current?.setBpm(clamped);
      onBpmChange?.(clamped);
    },
    [onBpmChange]
  );

  const handleStepBpm = useCallback(
    (delta: number) => {
      handleBpmChange(bpm + delta);
    },
    [bpm, handleBpmChange]
  );

  const handleTimeSignatureChange = useCallback((sig: TimeSignature) => {
    setTimeSignature(sig);
    engineRef.current?.setTimeSignature(sig);
  }, []);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    engineRef.current?.setVolume(newVol);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      const restored = prevVolume > 0 ? prevVolume : 0.8;
      setIsMuted(false);
      setVolume(restored);
      engineRef.current?.setVolume(restored);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
      engineRef.current?.setVolume(0);
    }
  }, [isMuted, prevVolume, volume]);

  const handleTap = useCallback(() => {
    if (!engineRef.current) return;
    const computedBpm = engineRef.current.tap();
    setBpm(computedBpm);
    onBpmChange?.(computedBpm);
    setTapPulsing(true);
    setTimeout(() => setTapPulsing(false), 150);
  }, [onBpmChange]);

  const beatsPerMeasure = engineRef.current?.getBeatsPerMeasure() ?? (
    timeSignature === "3/4" || timeSignature === "3/8" ? 3 :
    timeSignature === "6/8" ? 6 :
    timeSignature === "2/4" ? 2 : 4
  );

  return (
    <div
      role="region"
      aria-label="Metronome and tempo controls"
      className={`relative inline-flex items-center ${className}`}
    >
      {/* Closed Pill State */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs shadow-sm backdrop-blur-sm transition-colors ${
          isPlaying ? "border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]" : "hover:border-zinc-700"
        }`}
      >
        {/* Play/Pause Toggle */}
        <button
          type="button"
          data-testid="metronome-toggle"
          aria-label={isPlaying ? "Stop metronome" : "Start metronome"}
          onClick={handleTogglePlay}
          className={`flex items-center justify-center p-1.5 rounded-md transition-all ${
            isPlaying
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
          }`}
        >
          {isPlaying ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </button>

        {/* BPM readout button (Clicking opens popover) */}
        <button
          type="button"
          data-testid="metronome-bpm-display"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold text-zinc-100 hover:text-cyan-300 hover:bg-zinc-800 transition"
          title={`${bpm} BPM (${getTempoMarking(bpm)}) — Click for Tempo Settings`}
        >
          <span>{bpm}</span>
          <span className="text-[10px] text-zinc-400 font-sans font-normal">BPM</span>
        </button>

        {/* Animated Beat LED Dots */}
        <div
          data-testid="metronome-beat-leds"
          aria-live="polite"
          aria-label={`Beat indicator: ${beatsPerMeasure} beats`}
          className="flex items-center gap-1 px-1"
        >
          {Array.from({ length: beatsPerMeasure }).map((_, idx) => {
            const isActive = activeBeat === idx;
            const isAccent = idx === 0 || (isActive && isAccentBeat);
            const isCompoundAccent = timeSignature === "6/8" && idx === 3;

            return (
              <span
                key={idx}
                data-testid={`beat-dot-${idx}`}
                className={`inline-block rounded-full transition-all duration-100 ${
                  isActive
                    ? isAccent
                      ? "w-2.5 h-2.5 bg-cyan-400 shadow-[0_0_12px_#06b6d4] scale-125 ring-1 ring-white"
                      : isCompoundAccent
                        ? "w-2 h-2 bg-indigo-400 shadow-[0_0_8px_#818cf8] scale-110"
                        : "w-2 h-2 bg-purple-400 shadow-[0_0_8px_#c084fc] scale-110"
                    : "w-2 h-2 bg-zinc-700/80 hover:bg-zinc-600"
                }`}
                title={`Beat ${idx + 1}${isAccent ? " (Accent)" : ""}`}
              />
            );
          })}
        </div>

        {/* Stepper Buttons (-1 / +1) */}
        {!compact && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              data-testid="metronome-step-down"
              aria-label="Decrease tempo by 1 BPM"
              onClick={() => handleStepBpm(-1)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              data-testid="metronome-step-up"
              aria-label="Increase tempo by 1 BPM"
              onClick={() => handleStepBpm(1)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Settings Popover Toggle Button */}
        <button
          type="button"
          data-testid="metronome-settings-btn"
          aria-label="Toggle metronome settings"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`p-1 rounded transition ${
            isOpen
              ? "bg-zinc-800 text-cyan-400"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded Popover Modal */}
      {isOpen && (
        <div
          ref={popoverRef}
          data-testid="metronome-popover"
          className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 p-4 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl backdrop-blur-xl text-zinc-100 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⏱️</span>
              <div>
                <h4 className="text-xs font-bold text-zinc-200">Metronome & Rhythm</h4>
                <p className="text-[10px] text-zinc-400">
                  {getTempoMarking(bpm)} • {timeSignature} Time
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tempo Slider & Steppers */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Tempo:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-cyan-400 text-sm">{bpm}</span>
                <span className="text-zinc-500 text-[11px]">BPM</span>
              </div>
            </div>

            <input
              type="range"
              min={30}
              max={300}
              value={bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
              aria-label="Tempo slider in BPM"
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            {/* Steppers: -5, -1, +1, +5 */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[-5, -1, 1, 5].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  data-testid={`metronome-step-${delta > 0 ? `plus-${delta}` : `minus-${Math.abs(delta)}`}`}
                  onClick={() => handleStepBpm(delta)}
                  className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-xs font-mono font-semibold text-zinc-300 hover:text-white transition"
                  aria-label={`${delta > 0 ? "Increase" : "Decrease"} tempo by ${Math.abs(delta)} BPM`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* Tap Tempo Button */}
          <div className="pt-1 border-t border-zinc-800/80">
            <button
              type="button"
              data-testid="metronome-tap-tempo-btn"
              onClick={handleTap}
              className={`w-full py-2.5 px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm ${
                tapPulsing
                  ? "bg-cyan-500 text-zinc-950 border-cyan-400 scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                  : "bg-zinc-800/90 hover:bg-zinc-750 text-cyan-300 border-zinc-700/80 hover:border-cyan-500/50"
              }`}
            >
              <HandMetal className="w-4 h-4 text-cyan-400" />
              <span>Tap Tempo (Click to Beat)</span>
            </button>
          </div>

          {/* Time Signature Buttons */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 font-medium">Time Signature:</span>
            <div className="grid grid-cols-5 gap-1">
              {TIME_SIGNATURES.map((sig) => {
                const isSelected = timeSignature === sig;
                return (
                  <button
                    key={sig}
                    type="button"
                    data-testid={`metronome-meter-${sig.replace("/", "-")}`}
                    onClick={() => handleTimeSignatureChange(sig)}
                    className={`py-1.5 rounded text-xs font-mono font-bold transition ${
                      isSelected
                        ? "bg-cyan-500 text-zinc-950 shadow-sm"
                        : "bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white"
                    }`}
                  >
                    {sig}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Volume:</span>
              <span className="font-mono text-zinc-400 text-[11px]">
                {isMuted ? "Muted" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="metronome-mute-btn"
                onClick={handleToggleMute}
                aria-label={isMuted ? "Unmute metronome" : "Mute metronome"}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                aria-label="Metronome volume slider"
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
