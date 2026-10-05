'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { PREDEFINED_OCTAVE_WINDOWS, OctaveWindow } from '@/types/viewport';
import { keyRect, WHITE_KEY_COUNT } from '@/lib/piano';

export interface KeyboardProps {
  activeNotes?: Set<number>;
  expectedNotes?: Set<number>;
  onNoteOn?: (pitch: number) => void;
  onNoteOff?: (pitch: number) => void;
  /** External camera offset in virtual pixels */
  cameraOffset?: number;
  /** Callback when user manually pans or shifts octave */
  onCameraOffsetChange?: (offset: number) => void;
  /** Auto-tracking active note centroid mode */
  autoTrack?: boolean;
  onToggleAutoTrack?: () => void;
  className?: string;
}

const isWhiteKey = (note: number) => {
  const pc = note % 12;
  return [0, 2, 4, 5, 7, 9, 11].includes(pc);
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteLabel(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const noteName = NOTE_NAMES[pitch % 12];
  return `${noteName}${octave}`;
}

const MIN_NOTE = 21; // A0
const MAX_NOTE = 108; // C8

export function Keyboard({
  activeNotes = new Set(),
  expectedNotes = new Set(),
  onNoteOn,
  onNoteOff,
  cameraOffset,
  onCameraOffsetChange,
  autoTrack = false,
  onToggleAutoTrack,
  className = '',
}: KeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const [windowIndex, setWindowIndex] = useState<number>(2); // Default to C3 - B4 (Middle)
  const [internalCameraX, setInternalCameraX] = useState<number>(0);

  // Drag pan state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartCamRef = useRef<number>(0);

  // Measure container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute key and virtual strip dimensions
  // On mobile (<768px), each white key is at least 26px so 15 white keys fit in ~390px
  const whiteKeyWidth = isFullView
    ? containerWidth / WHITE_KEY_COUNT
    : Math.max(26, containerWidth / 15);

  const virtualWidth = isFullView ? containerWidth : WHITE_KEY_COUNT * whiteKeyWidth;
  const maxScrollX = Math.max(0, virtualWidth - containerWidth);

  // Active camera offset (controlled prop if provided, else internal state)
  const currentCameraX = cameraOffset !== undefined ? cameraOffset : internalCameraX;

  const setCameraX = useCallback(
    (newX: number) => {
      const clamped = Math.max(0, Math.min(maxScrollX, newX));
      setInternalCameraX(clamped);
      onCameraOffsetChange?.(clamped);
    },
    [maxScrollX, onCameraOffsetChange]
  );

  // Handle Octave window jump
  const jumpToOctave = useCallback(
    (index: number) => {
      const targetWindow: OctaveWindow = PREDEFINED_OCTAVE_WINDOWS[index];
      if (!targetWindow) return;
      setWindowIndex(index);
      const targetX = targetWindow.startWhiteIndex * whiteKeyWidth;
      setCameraX(targetX);
    },
    [whiteKeyWidth, setCameraX]
  );

  // All 88 keys layout array
  const allKeys = React.useMemo(() => {
    const list: Array<{ note: number; white: boolean; whiteIndex: number }> = [];
    let wIdx = 0;
    for (let note = MIN_NOTE; note <= MAX_NOTE; note++) {
      const white = isWhiteKey(note);
      list.push({ note, white, whiteIndex: wIdx });
      if (white) wIdx++;
    }
    return list;
  }, []);

  // Touch / Pointer gesture drag handling
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button drag or touch
    if (isFullView) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartCamRef.current = currentCameraX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isFullView) return;
    const deltaX = e.clientX - dragStartXRef.current;
    if (Math.abs(deltaX) > 5) {
      const newCameraX = dragStartCamRef.current - deltaX;
      setCameraX(newCameraX);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const activeWindow = PREDEFINED_OCTAVE_WINDOWS[windowIndex] || PREDEFINED_OCTAVE_WINDOWS[2];

  return (
    <div
      role="application"
      aria-label="Interactive piano keyboard"
      className={`w-full flex flex-col items-center select-none ${className}`}
    >
      {/* Responsive Octave & Camera Control Bar */}
      <div className="flex items-center justify-between w-full px-2.5 py-1.5 mb-2 bg-zinc-900/90 rounded-lg border border-zinc-800 text-xs gap-2">
        {/* Previous Octave Button */}
        <button
          type="button"
          disabled={isFullView || windowIndex <= 0}
          onClick={() => jumpToOctave(Math.max(0, windowIndex - 1))}
          aria-label="Previous Octave Range"
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-700 active:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none transition-colors font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden xs:inline">Oct {Math.max(0, windowIndex - 1)}</span>
        </button>

        {/* Center Octave & Auto-Follow Status Indicator */}
        <div className="flex items-center gap-2" aria-live="polite">
          <span className="font-semibold text-cyan-400 text-xs sm:text-sm">
            {isFullView ? 'Full 88 Keys (88)' : activeWindow.label}
          </span>

          {onToggleAutoTrack && (
            <button
              type="button"
              onClick={onToggleAutoTrack}
              aria-pressed={autoTrack}
              title="Auto-track upcoming note centroid camera"
              className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition border ${
                autoTrack
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Auto Follow</span>
            </button>
          )}
        </div>

        {/* Next Octave & Viewport Mode Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isFullView || windowIndex >= PREDEFINED_OCTAVE_WINDOWS.length - 1}
            onClick={() => jumpToOctave(Math.min(PREDEFINED_OCTAVE_WINDOWS.length - 1, windowIndex + 1))}
            aria-label="Next Octave Range"
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-700 active:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none transition-colors font-medium"
          >
            <span className="hidden xs:inline">Oct {Math.min(PREDEFINED_OCTAVE_WINDOWS.length - 1, windowIndex + 1)}</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFullView(!isFullView);
              if (!isFullView) setCameraX(0);
            }}
            aria-label={isFullView ? 'Switch to Zoomed 2-Octave View' : 'Switch to Full 88-Key View'}
            title={isFullView ? 'Switch to Zoomed 2-Octave View' : 'Switch to Full 88-Key View'}
            className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none transition-colors"
          >
            {isFullView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Piano Keyboard Strip Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full overflow-hidden bg-zinc-950/80 p-1.5 sm:p-3 rounded-xl border border-zinc-800/80 shadow-2xl touch-pan-x"
      >
        <div
          ref={stripRef}
          className="relative shadow-2xl rounded-b-lg border-t-4 border-zinc-900 transition-transform duration-100 ease-out will-change-transform"
          style={{
            width: `${virtualWidth}px`,
            transform: `translate3d(${-currentCameraX}px, 0, 0)`,
          }}
        >
          {/* White keys layer */}
          <div className="flex w-full">
            {allKeys
              .filter((k) => k.white)
              .map(({ note }) => {
                const isActive = activeNotes.has(note);
                const isExpected = expectedNotes.has(note);
                const isCKey = note % 12 === 0;

                let bgClass =
                  'bg-gradient-to-b from-white to-zinc-100 border-zinc-300 text-zinc-600 hover:to-zinc-200';
                if (isActive && isExpected) {
                  bgClass =
                    'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.8)]';
                } else if (isActive && !isExpected) {
                  bgClass =
                    'bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.8)]';
                } else if (!isActive && isExpected) {
                  bgClass =
                    'bg-cyan-200/95 border-cyan-400 text-cyan-950 shadow-[0_0_12px_rgba(34,211,238,0.5)]';
                }

                return (
                  <button
                    key={note}
                    type="button"
                    tabIndex={0}
                    aria-label={`Key ${getNoteLabel(note)}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onNoteOn?.(note);
                    }}
                    onPointerUp={() => onNoteOff?.(note)}
                    onPointerLeave={() => onNoteOff?.(note)}
                    style={{ width: `${whiteKeyWidth}px` }}
                    className={`h-36 sm:h-44 border-r border-b first:border-l rounded-b-md flex-shrink-0 transition-colors duration-75 flex flex-col justify-end items-center pb-2 cursor-pointer touch-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none ${bgClass}`}
                  >
                    {isCKey && (
                      <span className="text-[11px] font-bold opacity-80 pointer-events-none text-zinc-900">
                        {getNoteLabel(note)}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Black keys layer */}
          {allKeys
            .filter((k) => !k.white)
            .map(({ note }) => {
              const isActive = activeNotes.has(note);
              const isExpected = expectedNotes.has(note);

              let bgClass =
                'bg-gradient-to-b from-zinc-800 to-zinc-950 border-zinc-950 hover:to-zinc-900';
              if (isActive && isExpected) {
                bgClass =
                  'bg-emerald-600 border-emerald-500 shadow-[0_0_15px_rgba(5,150,105,0.9)]';
              } else if (isActive && !isExpected) {
                bgClass =
                  'bg-rose-600 border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.9)]';
              } else if (!isActive && isExpected) {
                bgClass =
                  'bg-cyan-600 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]';
              }

              const rect = keyRect(note, virtualWidth);

              return (
                <button
                  key={note}
                  type="button"
                  tabIndex={0}
                  aria-label={`Black Key ${getNoteLabel(note)}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onNoteOn?.(note);
                  }}
                  onPointerUp={() => onNoteOff?.(note)}
                  onPointerLeave={() => onNoteOff?.(note)}
                  className={`absolute top-0 h-22 sm:h-28 rounded-b-sm z-10 flex-shrink-0 transition-colors duration-75 shadow-lg border-b-2 cursor-pointer touch-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none ${bgClass}`}
                  style={{
                    left: `${rect.x}px`,
                    width: `${rect.w}px`,
                  }}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default Keyboard;
