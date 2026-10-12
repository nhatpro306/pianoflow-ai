"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { keyRect, WHITE_KEY_COUNT } from "@/lib/piano";
import type { ExpectedNote, ScoreEvent, HandPracticeMode } from "@/lib/midi/MidiEngine";
import {
  type LiveMicroTimingFeedback,
  type MicroTimingSessionStats,
  classifyMicroTiming,
} from "@/lib/practice/microTiming";
import { MicroTimingGauge } from "./MicroTimingGauge";

interface PracticeCanvasProps {
  notes: ExpectedNote[];
  currentTime?: number; // legacy/fallback in ms
  currentTimeRef?: React.RefObject<number | null> | React.MutableRefObject<number>;
  isPlaying?: boolean;
  activeNotes: Set<number>;
  expectedNotes?: Set<number>;
  lastScore: ScoreEvent | null;
  fallSpeed?: number; // px per second
  handMode?: HandPracticeMode;
  loopStartMs?: number | null;
  loopEndMs?: number | null;
  isLoopActive?: boolean;
  showNoteNames?: boolean;
  /** External camera horizontal offset */
  cameraX?: number;
  /** Callback for updated camera offset during auto-tracking */
  onCameraChange?: (cameraX: number, virtualWidth: number) => void;
  /** Whether auto centroid tracking camera is active */
  autoTrack?: boolean;
  /** Forced full 88-key view (no horizontal camera zoom) */
  isFullView?: boolean;
  /** Live micro-timing strike feedback (Milestone N.1) */
  timingFeedback?: LiveMicroTimingFeedback | null;
  /** Mini session stats for micro-timing HUD */
  timingStats?: MicroTimingSessionStats | null;
  /** Whether to render embedded MicroTimingGauge overlay inside canvas */
  showTimingGauge?: boolean;
  className?: string;
}

const DEFAULT_FALL_SPEED = 180; // px per second

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getPitchName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const noteName = NOTE_NAMES[pitch % 12];
  return `${noteName}${octave}`;
}

export function calculateCentroidTargetX(
  notes: ExpectedNote[],
  currentTime: number,
  viewportWidth: number,
  virtualWidth: number
): number {
  if (virtualWidth <= viewportWidth) return 0;

  const lookaheadMs = 1500;
  const imminentThresholdMs = 500;
  const pastThresholdMs = 200;

  let totalWeight = 0;
  let weightedSumX = 0;

  for (const note of notes) {
    if (note.start <= currentTime + lookaheadMs && note.end >= currentTime - pastThresholdMs) {
      let weight = 0.5;
      if (note.start >= currentTime && note.start <= currentTime + imminentThresholdMs) {
        weight = 1.0;
      } else if (
        note.start > currentTime + imminentThresholdMs &&
        note.start <= currentTime + lookaheadMs
      ) {
        weight = Math.max(0.2, 1.0 - (note.start - (currentTime + imminentThresholdMs)) / 1000);
      } else if (note.start < currentTime && currentTime <= note.end) {
        weight = 0.5;
      }

      const lane = keyRect(note.pitch, virtualWidth);
      const xCenter = lane.x + lane.w / 2;
      weightedSumX += weight * xCenter;
      totalWeight += weight;
    }
  }

  let centroidX: number;
  if (totalWeight > 0) {
    centroidX = weightedSumX / totalWeight;
  } else {
    // Default to Middle C (pitch 60)
    const midCRect = keyRect(60, virtualWidth);
    centroidX = midCRect.x + midCRect.w / 2;
  }

  const targetX = centroidX - viewportWidth / 2;
  return Math.max(0, Math.min(virtualWidth - viewportWidth, targetX));
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  gravity: number;
  active: boolean;
}

class ParticlePool {
  private particles: Particle[] = [];

  constructor(maxSize = 250) {
    for (let i = 0; i < maxSize; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        alpha: 1,
        color: "#ffffff",
        size: 2,
        life: 0,
        maxLife: 30,
        gravity: 0.12,
        active: false,
      });
    }
  }

  public spawn(x: number, y: number, colors: string[], count = 15, spread = 4.0): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 0.8 + 0.2) * spread;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 2.0; // Upward bias
        p.alpha = 1;
        p.color = colors[Math.floor(Math.random() * colors.length)];
        p.size = Math.random() * 2.5 + 1.5;
        p.life = 0;
        p.maxLife = Math.floor(Math.random() * 20 + 20);
        p.gravity = 0.12;
        p.active = true;
        spawned++;
      }
    }
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife || p.alpha <= 0) {
        p.active = false;
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public clear(): void {
    for (const p of this.particles) {
      p.active = false;
    }
  }
}

export function PracticeCanvas({
  notes,
  currentTime,
  currentTimeRef,
  isPlaying = false,
  activeNotes,
  expectedNotes,
  lastScore,
  fallSpeed = DEFAULT_FALL_SPEED,
  handMode = "both",
  loopStartMs = null,
  loopEndMs = null,
  isLoopActive = false,
  showNoteNames = true,
  cameraX,
  onCameraChange,
  autoTrack = false,
  isFullView = false,
  timingFeedback = null,
  timingStats = null,
  showTimingGauge = true,
  className = "",
}: PracticeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Internal micro-timing feedback derived from lastScore when not explicitly supplied externally
  const [internalTimingFeedback, setInternalTimingFeedback] = useState<LiveMicroTimingFeedback | null>(null);
  const activeTimingFeedback =
    timingFeedback !== null && timingFeedback !== undefined
      ? timingFeedback
      : internalTimingFeedback;

  // Mutable camera offset and frame time
  const cameraXRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;

  // Sync external camera offset when explicitly controlled
  useEffect(() => {
    if (typeof cameraX === "number") {
      cameraXRef.current = cameraX;
    }
  }, [cameraX]);

  // Mutable particle pool stored in ref (zero React state re-render churn)
  const particlePoolRef = useRef<ParticlePool>(new ParticlePool(250));

  // Floating hit feedback animation
  const [activeFeedback, setActiveFeedback] = useState<{
    score: string;
    diff: number;
    pitch?: number;
    time: number;
  } | null>(null);

  const prevScoreRef = useRef<ScoreEvent | null>(null);

  // Resize observer to adapt canvas to container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;
  const whiteKeyWidth = isFullView ? width / WHITE_KEY_COUNT : Math.max(26, width / 15);
  const virtualWidth = isFullView ? width : WHITE_KEY_COUNT * whiteKeyWidth;

  useEffect(() => {
    if (lastScore && lastScore !== prevScoreRef.current) {
      prevScoreRef.current = lastScore;
      setActiveFeedback({
        score: lastScore.score,
        diff: Math.round(lastScore.timeDiff),
        pitch: lastScore.playedPitch ?? lastScore.note?.pitch,
        time: Date.now(),
      });

      // Classify micro-timing feedback from score event if not explicitly provided externally
      const struckPitch = lastScore.playedPitch ?? lastScore.note?.pitch ?? 60;
      const expectedPitch = lastScore.note?.pitch ?? struckPitch;
      const hand = (lastScore.note?.hand as "L" | "R") ?? (struckPitch >= 60 ? "R" : "L");
      const derived = classifyMicroTiming(
        lastScore.timeDiff,
        struckPitch,
        expectedPitch,
        hand,
        lastScore.note?.name,
        Date.now()
      );
      setInternalTimingFeedback(derived);

      // Spawn glowing radiant spark particles at hit location in virtual space
      const pitch = lastScore.playedPitch ?? lastScore.note?.pitch;
      if (pitch && pitch >= 21 && pitch <= 108) {
        const lane = keyRect(pitch, virtualWidth);
        const sparkX = lane.x + lane.w / 2;
        const sparkY = dimensions.height - 4;

        if (lastScore.score === "Perfect") {
          particlePoolRef.current.spawn(
            sparkX,
            sparkY,
            ["#ffffff", "#fbbf24", "#fef08a", "#38bdf8"],
            16,
            5.0
          );
        } else if (lastScore.score === "Good") {
          particlePoolRef.current.spawn(
            sparkX,
            sparkY,
            ["#22d3ee", "#38bdf8", "#818cf8"],
            12,
            3.5
          );
        } else if (lastScore.score === "Miss") {
          particlePoolRef.current.spawn(sparkX, sparkY, ["#f43f5e", "#fb7185"], 5, 2.0);
        }
      }
    }
  }, [lastScore, virtualWidth, dimensions.height]);

  // Micro-timing calibrated particle spark emission
  useEffect(() => {
    if (activeTimingFeedback) {
      const pitch = activeTimingFeedback.notePitch;
      if (pitch && pitch >= 21 && pitch <= 108) {
        const lane = keyRect(pitch, virtualWidth);
        const sparkX = lane.x + lane.w / 2;
        const sparkY = dimensions.height - 4;

        if (activeTimingFeedback.rating === "pocket") {
          particlePoolRef.current.spawn(
            sparkX,
            sparkY,
            ["#ffffff", "#10b981", "#34d399", "#a7f3d0"],
            18,
            5.0
          );
        } else if (activeTimingFeedback.rating === "early") {
          particlePoolRef.current.spawn(
            sparkX,
            sparkY,
            ["#ffffff", "#f59e0b", "#fbbf24", "#fef08a"],
            14,
            4.0
          );
        } else if (activeTimingFeedback.rating === "late") {
          particlePoolRef.current.spawn(
            sparkX,
            sparkY,
            ["#ffffff", "#0284c7", "#38bdf8", "#bae6fd"],
            14,
            4.0
          );
        } else if (activeTimingFeedback.rating === "miss") {
          particlePoolRef.current.spawn(sparkX, sparkY, ["#f43f5e", "#fb7185"], 6, 2.0);
        }
      }
    }
  }, [activeTimingFeedback, virtualWidth, dimensions.height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const curTime = currentTimeRef
      ? typeof currentTimeRef.current === "number"
        ? currentTimeRef.current
        : 0
      : typeof currentTime === "number"
        ? currentTime
        : 0;

    // 1. Centroid Auto-Tracking Camera Calculation
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameTimeRef.current) / 1000);
    lastFrameTimeRef.current = now;

    if (autoTrack && isPlaying && virtualWidth > width) {
      const targetX = calculateCentroidTargetX(notes, curTime, width, virtualWidth);
      const delta = targetX - cameraXRef.current;
      // Exponential smoothing with lambda = 5.0 s^-1
      if (Math.abs(delta) > 0.5) {
        cameraXRef.current += delta * (1 - Math.exp(-5.0 * dt));
        onCameraChangeRef.current?.(cameraXRef.current, virtualWidth);
      }
    }

    const currentCamX = Math.max(0, Math.min(virtualWidth - width, cameraXRef.current));

    // 2. Static Background Gradient in Screen Space
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#09090b");
    bgGradient.addColorStop(1, "#111116");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 3. Begin Horizontal Camera Translation
    ctx.save();
    ctx.translate(-currentCamX, 0);

    // Subtle lane guidelines for C keys in virtual space
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let pitch = 21; pitch <= 108; pitch++) {
      if (pitch % 12 === 0) {
        const lane = keyRect(pitch, virtualWidth);
        ctx.beginPath();
        ctx.moveTo(lane.x, 0);
        ctx.lineTo(lane.x, height);
        ctx.stroke();
      }
    }

    const hitY = height - 4; // Strike line at bottom
    const visibleTimeSpan = (hitY / fallSpeed) * 1000; // in ms

    // Draw active A-B loop boundary lines and shaded background region
    if (isLoopActive && loopStartMs !== null && loopEndMs !== null) {
      const yA = hitY - ((loopStartMs - curTime) / 1000) * fallSpeed;
      const yB = hitY - ((loopEndMs - curTime) / 1000) * fallSpeed;
      const topY = Math.max(0, Math.min(yA, yB));
      const bottomY = Math.min(hitY, Math.max(yA, yB));

      if (bottomY >= 0 && topY <= hitY) {
        ctx.save();
        ctx.fillStyle = "rgba(6, 182, 212, 0.08)";
        ctx.fillRect(0, topY, virtualWidth, bottomY - topY);

        // Marker A line
        if (yA >= 0 && yA <= hitY) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, yA);
          ctx.lineTo(virtualWidth, yA);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "#06b6d4";
          ctx.font = "bold 10px monospace";
          ctx.fillText("⮑ Loop Start A", 8, yA - 4);
        }

        // Marker B line
        if (yB >= 0 && yB <= hitY) {
          ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, yB);
          ctx.lineTo(virtualWidth, yB);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 10px monospace";
          ctx.fillText("⮐ Loop End B", 8, yB - 4);
        }
        ctx.restore();
      }
    }

    // Draw Falling Notes with Horizontal Frustum Culling
    for (const note of notes) {
      // Skip notes already scrolled past
      if (note.end < curTime - 200) continue;
      // Skip notes far in future
      if (note.start > curTime + visibleTimeSpan) continue;

      const lane = keyRect(note.pitch, virtualWidth);

      // Frustum culling check against camera viewport
      if (lane.x + lane.w < currentCamX - 40 || lane.x > currentCamX + width + 40) {
        continue;
      }

      const timeUntilHitMs = note.start - curTime;
      const bottom = hitY - (timeUntilHitMs / 1000) * fallSpeed;
      const durationMs = Math.max(100, note.end - note.start);
      const noteHeight = Math.max(10, (durationMs / 1000) * fallSpeed);
      const top = bottom - noteHeight;

      if (bottom < 0 || top > hitY) continue;

      const isBlackKey = [1, 3, 6, 8, 10].includes(note.pitch % 12);
      const noteW = isBlackKey ? lane.w * 0.95 : lane.w * 0.85;
      const x = lane.x + (lane.w - noteW) / 2;
      const clampedTop = Math.max(0, top);
      const renderHeight = Math.min(height, bottom) - clampedTop;

      if (renderHeight <= 0) continue;

      const isRH = note.hand ? note.hand === "R" : note.pitch >= 60;
      const isHandActive =
        handMode === "both" ||
        (handMode === "right" && isRH) ||
        (handMode === "left" && !isRH);

      const isCurrentExpected = expectedNotes
        ? expectedNotes.has(note.pitch)
        : Math.abs(note.start - curTime) <= 500;

      ctx.save();

      // Hand isolation luminescence & dimming
      if (!isHandActive) {
        ctx.globalAlpha = 0.35;
        ctx.shadowBlur = 0;
        ctx.fillStyle = isRH ? "#7e22ce" : "#0e7490";
      } else {
        ctx.globalAlpha = 1.0;
        if (isCurrentExpected) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#38bdf8";
          ctx.fillStyle = isRH ? "#c084fc" : "#38bdf8";
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = isRH ? "#a855f7" : "#06b6d4";
          ctx.fillStyle = isRH ? "#a855f7" : "#06b6d4";
        }
      }

      ctx.beginPath();
      ctx.roundRect(x, clampedTop, noteW, renderHeight, 4);
      ctx.fill();

      // Inner gradient highlight
      const innerGrad = ctx.createLinearGradient(x, clampedTop, x, clampedTop + renderHeight);
      innerGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
      innerGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
      innerGrad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.roundRect(x, clampedTop, noteW, renderHeight, 4);
      ctx.fill();

      // Render note name label inside note block when height >= 14px
      if (showNoteNames && renderHeight >= 14) {
        const label = note.name || getPitchName(note.pitch);
        ctx.font = "bold 9px 'JetBrains Mono', monospace, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillText(label, x + noteW / 2 + 0.5, clampedTop + renderHeight / 2 + 0.5);
        ctx.fillStyle = isHandActive ? "#ffffff" : "rgba(255, 255, 255, 0.65)";
        ctx.fillText(label, x + noteW / 2, clampedTop + renderHeight / 2);
      }

      ctx.restore();
    }

    // Glowing Strike line across virtual width
    const strikeGrad = ctx.createLinearGradient(0, hitY - 4, 0, hitY + 2);
    strikeGrad.addColorStop(0, "rgba(34, 211, 238, 0)");
    strikeGrad.addColorStop(0.5, "rgba(34, 211, 238, 0.9)");
    strikeGrad.addColorStop(1, "rgba(56, 189, 248, 1)");
    ctx.fillStyle = strikeGrad;
    ctx.fillRect(0, hitY - 2, virtualWidth, 4);

    // Active key hit highlights & upward radiant beam flash
    for (const pitch of activeNotes) {
      if (pitch >= 21 && pitch <= 108) {
        const lane = keyRect(pitch, virtualWidth);
        const isRH = pitch >= 60;
        const isExp = expectedNotes
          ? expectedNotes.has(pitch)
          : notes.some((n) => n.pitch === pitch && Math.abs(n.start - curTime) <= 500);

        ctx.save();
        const baseColor = isExp
          ? isRH
            ? "168, 85, 247"
            : "34, 211, 238"
          : "244, 63, 94";

        ctx.shadowColor = `rgba(${baseColor}, 0.8)`;
        ctx.shadowBlur = 24;
        ctx.fillStyle = `rgba(${baseColor}, 0.9)`;
        ctx.fillRect(lane.x, hitY - 8, lane.w, 10);

        // Flash beam upwards (70px height)
        const beamHeight = 70;
        const beamGrad = ctx.createLinearGradient(0, hitY - beamHeight, 0, hitY);
        beamGrad.addColorStop(0, `rgba(${baseColor}, 0)`);
        beamGrad.addColorStop(0.5, `rgba(${baseColor}, 0.2)`);
        beamGrad.addColorStop(1, `rgba(${baseColor}, 0.55)`);
        ctx.fillStyle = beamGrad;
        ctx.fillRect(lane.x - 1, hitY - beamHeight, lane.w + 2, beamHeight);
        ctx.restore();
      }
    }

    // Live Micro-Timing Strike Reticle / Target Bullseye at strike line (Milestone N.1)
    if (activeTimingFeedback && Date.now() - activeTimingFeedback.timestamp < 1000) {
      const p = activeTimingFeedback.notePitch;
      if (p >= 21 && p <= 108) {
        const lane = keyRect(p, virtualWidth);
        const centerX = lane.x + lane.w / 2;
        const color = activeTimingFeedback.color; // #10b981 (pocket), #f59e0b (early), #0284c7 (late), #ef4444 (miss)
        const age = Date.now() - activeTimingFeedback.timestamp;
        const alpha = Math.max(0, 1 - age / 1000);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = `${color}25`;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;

        // Outer Reticle Target Ring
        const ringRadius = Math.max(9, lane.w * 0.45);
        ctx.beginPath();
        ctx.arc(centerX, hitY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        // Inner Bullseye Dot
        ctx.beginPath();
        ctx.arc(centerX, hitY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Precision Crosshairs
        ctx.beginPath();
        ctx.moveTo(centerX - ringRadius - 4, hitY);
        ctx.lineTo(centerX + ringRadius + 4, hitY);
        ctx.moveTo(centerX, hitY - ringRadius - 4);
        ctx.lineTo(centerX, hitY + ringRadius + 4);
        ctx.stroke();

        ctx.restore();
      }
    }

    // Update and draw active particle sparks in virtual space
    particlePoolRef.current.updateAndDraw(ctx);

    // 4. Restore Camera Matrix Translation
    ctx.restore();

    ctx.restore();
  }, [
    width,
    height,
    virtualWidth,
    notes,
    currentTimeRef,
    currentTime,
    isPlaying,
    autoTrack,
    activeNotes,
    expectedNotes,
    fallSpeed,
    handMode,
    loopStartMs,
    loopEndMs,
    isLoopActive,
    showNoteNames,
    activeTimingFeedback,
  ]);

  useEffect(() => {
    let animId: number | null = null;

    const render = () => {
      draw();
      if (isPlaying) {
        animId = requestAnimationFrame(render);
      }
    };

    draw();

    if (isPlaying) {
      animId = requestAnimationFrame(render);
    }

    return () => {
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [isPlaying, draw]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex-1 overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: dimensions.width, height: dimensions.height }}
      />

      {/* Embedded Live Micro-Timing Strike Gauge (default visible during active practice) */}
      {showTimingGauge !== false && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <MicroTimingGauge feedback={activeTimingFeedback} stats={timingStats} />
        </div>
      )}

      {/* Real-time Hit Feedback Popup Overlay in Screen Space (fallback when timing gauge is explicitly hidden) */}
      {showTimingGauge === false && activeFeedback && Date.now() - activeFeedback.time < 1200 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-90 flex flex-col items-center">
          <span
            className={`text-2xl font-black tracking-wider uppercase drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] ${
              activeFeedback.score === "Perfect"
                ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                : activeFeedback.score === "Good"
                  ? "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]"
                  : "text-rose-400 drop-shadow-[0_0_12px_rgba(251,113,133,0.8)]"
            }`}
          >
            {activeFeedback.score}
          </span>
          {activeFeedback.score !== "Miss" && activeFeedback.diff > 0 && (
            <span className="text-xs font-mono font-medium text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full mt-1">
              {activeFeedback.diff}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default PracticeCanvas;
