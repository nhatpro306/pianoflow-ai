"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Trash2, FileAudio, AlertCircle } from "lucide-react";

export interface AudioPreviewWaveformProps {
  file: File | Blob;
  fileName?: string;
  onRemove?: () => void;
  className?: string;
}

interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  fileSize?: number;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function AudioPreviewWaveform({
  file,
  fileName,
  onRemove,
  className = "",
}: AudioPreviewWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  // Web Audio playback references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeHardwareRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const effectiveFileName =
    fileName || (file instanceof File ? file.name : "Recorded Audio");
  const fileSize = file instanceof File ? file.size : file.size;

  // Initialize Web Audio and decode audio file
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setDecodeError(null);

    const decode = async () => {
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtxClass();
        audioCtxRef.current = ctx;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volumeRef.current, ctx.currentTime);
        gain.connect(ctx.destination);
        gainNodeRef.current = gain;

        const arrayBuffer = await file.arrayBuffer();
        if (isCancelled) return;

        // Clone buffer slice in case decodeAudioData mutates memory
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        if (isCancelled) return;

        setAudioBuffer(decodedBuffer);
        setMetadata({
          duration: decodedBuffer.duration,
          sampleRate: decodedBuffer.sampleRate,
          channels: decodedBuffer.numberOfChannels,
          fileSize,
        });

        // Compute normalized waveform peaks
        const numChannels = decodedBuffer.numberOfChannels;
        const totalSamples = decodedBuffer.length;
        const BINS = 120; // Resolution of waveform bars
        const samplesPerBin = Math.max(1, Math.floor(totalSamples / BINS));
        const computedPeaks: number[] = new Array(BINS).fill(0);

        const channelData: Float32Array[] = [];
        for (let c = 0; c < numChannels; c++) {
          channelData.push(decodedBuffer.getChannelData(c));
        }

        for (let b = 0; b < BINS; b++) {
          let maxVal = 0;
          const startSample = b * samplesPerBin;
          const endSample = Math.min(totalSamples, startSample + samplesPerBin);

          for (let i = startSample; i < endSample; i += 4) {
            let sum = 0;
            for (let c = 0; c < numChannels; c++) {
              sum += Math.abs(channelData[c][i] || 0);
            }
            const avg = sum / numChannels;
            if (avg > maxVal) maxVal = avg;
          }

          // Dynamic range compression for clear aesthetic peaks
          const compressed = Math.log(1 + 4 * maxVal) / Math.log(5);
          computedPeaks[b] = Math.max(0.08, Math.min(1.0, compressed));
        }

        setPeaks(computedPeaks);
        setIsLoading(false);
      } catch (err) {
        if (isCancelled) return;
        console.error("Audio decoding failed:", err);
        setDecodeError(
          "Unable to decode audio preview. The file might be compressed with an unsupported codec."
        );
        setIsLoading(false);
      }
    };

    void decode();

    return () => {
      isCancelled = true;
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // ignore
        }
        sourceNodeRef.current = null;
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close().catch(() => undefined);
      }
    };
  }, [file, fileSize]);

  // Handle Playhead Animation Frame Loop
  const updatePlayhead = useCallback(() => {
    if (!audioCtxRef.current || !metadata) return;

    const elapsed = audioCtxRef.current.currentTime - startTimeHardwareRef.current;
    const current = startOffsetRef.current + elapsed;

    if (current >= metadata.duration) {
      setCurrentTime(metadata.duration);
      setIsPlaying(false);
      startOffsetRef.current = 0;
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // ignore
        }
        sourceNodeRef.current = null;
      }
      return;
    }

    setCurrentTime(current);
    animationFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, [metadata]);

  const startPlaybackAt = useCallback(
    (offsetSec: number) => {
      if (!audioCtxRef.current || !audioBuffer || !gainNodeRef.current) return;
      const ctx = audioCtxRef.current;

      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // ignore
        }
        sourceNodeRef.current = null;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current);

      const clampedOffset = Math.max(0, Math.min(audioBuffer.duration, offsetSec));
      source.start(0, clampedOffset);
      sourceNodeRef.current = source;
      startTimeHardwareRef.current = ctx.currentTime;
      startOffsetRef.current = clampedOffset;

      source.onended = () => {
        if (sourceNodeRef.current === source) {
          setIsPlaying(false);
          startOffsetRef.current = 0;
          setCurrentTime(0);
        }
      };

      setIsPlaying(true);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    },
    [audioBuffer, updatePlayhead]
  );

  const pausePlayback = useCallback(() => {
    if (!audioCtxRef.current) return;
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    const elapsed = audioCtxRef.current.currentTime - startTimeHardwareRef.current;
    startOffsetRef.current = Math.min(
      metadata?.duration ?? 0,
      startOffsetRef.current + Math.max(0, elapsed)
    );
    setCurrentTime(startOffsetRef.current);
    setIsPlaying(false);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [metadata]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      if (metadata && currentTime >= metadata.duration) {
        startPlaybackAt(0);
      } else {
        startPlaybackAt(startOffsetRef.current);
      }
    }
  }, [currentTime, isPlaying, metadata, pausePlayback, startPlaybackAt]);

  const handleSeek = useCallback(
    (targetFraction: number) => {
      if (!metadata) return;
      const targetTime = targetFraction * metadata.duration;
      setCurrentTime(targetTime);
      startOffsetRef.current = targetTime;
      if (isPlaying) {
        startPlaybackAt(targetTime);
      }
    },
    [isPlaying, metadata, startPlaybackAt]
  );

  const handleReset = useCallback(() => {
    pausePlayback();
    startOffsetRef.current = 0;
    setCurrentTime(0);
  }, [pausePlayback]);

  // Volume & Mute Controls
  const toggleMute = useCallback(() => {
    if (!gainNodeRef.current || !audioCtxRef.current) return;
    if (isMuted) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
      setIsMuted(false);
    } else {
      gainNodeRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const changeVolume = useCallback(
    (newVol: number) => {
      setVolume(newVol);
      setIsMuted(newVol === 0);
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setValueAtTime(newVol, audioCtxRef.current.currentTime);
      }
    },
    []
  );

  // Canvas Waveform Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 70;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const numBars = peaks.length;
    const barWidth = Math.max(1.5, (width / numBars) * 0.65);
    const gap = (width - numBars * barWidth) / (numBars - 1);
    const progressFraction = metadata ? Math.max(0, Math.min(1, currentTime / metadata.duration)) : 0;

    const centerY = height / 2;

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + gap);
      const barFraction = i / numBars;
      const isPast = barFraction <= progressFraction;

      const peakHeight = Math.max(4, peaks[i] * (height * 0.88));
      const topY = centerY - peakHeight / 2;

      ctx.beginPath();
      // Rounded bar cap
      const radius = barWidth / 2;
      ctx.roundRect(x, topY, barWidth, peakHeight, radius);

      if (isPast) {
        // Bright cyan with glowing violet accent
        const grad = ctx.createLinearGradient(0, topY, 0, topY + peakHeight);
        grad.addColorStop(0, "#22d3ee");
        grad.addColorStop(0.5, "#38bdf8");
        grad.addColorStop(1, "#818cf8");
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(6, 182, 212, 0.4)";
        ctx.shadowBlur = 6;
      } else {
        // Subtle muted cyan for unplayed portion
        ctx.fillStyle = "rgba(6, 182, 212, 0.35)";
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }

    // Playhead Line Cursor
    const playheadX = progressFraction * width;
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 2);
    ctx.lineTo(playheadX, height - 2);
    ctx.stroke();

    // Hover seek preview line
    if (hoverFraction !== null) {
      const hoverX = hoverFraction * width;
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(168, 85, 247, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [peaks, currentTime, metadata, hoverFraction]);

  // Mouse Scrubbing Handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    handleSeek(fraction);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    setHoverFraction(fraction);
  };

  const handleCanvasMouseLeave = () => {
    setHoverFraction(null);
  };

  return (
    <div
      ref={containerRef}
      data-testid="audio-preview-waveform-container"
      className={`w-full rounded-2xl border border-white/10 bg-[#121215]/80 p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4 ${className}`}
    >
      {/* File Header & Metadata Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 border border-cyan-500/20">
            <FileAudio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4
              data-testid="audio-preview-file-name"
              className="text-sm font-bold text-zinc-100 truncate"
              title={effectiveFileName}
            >
              {effectiveFileName}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
              {metadata && (
                <>
                  <span data-testid="audio-preview-duration-badge">
                    {formatTime(metadata.duration)}
                  </span>
                  <span>•</span>
                  <span>{(metadata.sampleRate / 1000).toFixed(1)} kHz</span>
                  <span>•</span>
                  <span>{metadata.channels === 1 ? "Mono" : "Stereo"}</span>
                </>
              )}
              {fileSize && (
                <>
                  <span>•</span>
                  <span>{formatBytes(fileSize)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Remove file button */}
        {onRemove && (
          <button
            type="button"
            data-testid="audio-preview-remove-btn"
            onClick={onRemove}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
            title="Remove file"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        )}
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-6 gap-2 text-xs text-zinc-400 animate-pulse">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Decoding audio waveform...</span>
        </div>
      )}

      {decodeError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{decodeError}</span>
        </div>
      )}

      {/* Interactive Waveform Canvas */}
      {!isLoading && !decodeError && (
        <div className="flex flex-col gap-2">
          <div className="relative w-full h-20 bg-zinc-950/60 rounded-xl p-2 border border-zinc-800/60 overflow-hidden cursor-pointer group">
            <canvas
              ref={canvasRef}
              data-testid="audio-preview-waveform-canvas"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="w-full h-full block"
            />

            {/* Hover timestamp tooltip */}
            {hoverFraction !== null && metadata && (
              <div
                className="absolute top-1 pointer-events-none px-1.5 py-0.5 rounded bg-zinc-900 border border-purple-500/60 text-[10px] font-mono text-purple-300 shadow-md transform -translate-x-1/2"
                style={{
                  left: `${Math.max(5, Math.min(95, hoverFraction * 100))}%`,
                }}
              >
                {formatTime(hoverFraction * metadata.duration)}
              </div>
            )}
          </div>

          {/* Playback Controls & Timestamp */}
          <div className="flex items-center justify-between gap-3 pt-1 text-xs">
            {/* Play/Pause & Reset buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="audio-preview-play-btn"
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause audio preview" : "Play audio preview"}
                className={`flex items-center justify-center p-2 rounded-xl font-semibold transition shadow-md ${
                  isPlaying
                    ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                    : "bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                data-testid="audio-preview-reset-btn"
                onClick={handleReset}
                aria-label="Restart audio preview from beginning"
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Time display: 00:12 / 01:45 */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <span data-testid="audio-preview-current-time" className="text-zinc-200 font-bold">
                  {formatTime(currentTime)}
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-400">
                  {formatTime(metadata?.duration || 0)}
                </span>
              </div>
            </div>

            {/* Volume slider & mute button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute preview" : "Mute preview"}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-zinc-300" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Audio preview volume"
                className="w-16 sm:w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
