"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { detectPitchFromSamples, PitchDetectionResult } from "./pitchDetection";

export interface UseMicrophonePitchOptions {
  enabled?: boolean;
  rmsThreshold?: number;
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

export function useMicrophonePitch(options: UseMicrophonePitchOptions = {}) {
  const { enabled = false, rmsThreshold = 0.015, onNoteOn, onNoteOff } = options;

  const [isListening, setIsListening] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [currentResult, setCurrentResult] = useState<PitchDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Debouncing & stability tracking refs
  const candidatePitchRef = useRef<number | null>(null);
  const candidateFramesRef = useRef<number>(0);
  const activePitchRef = useRef<number | null>(null);
  const silenceFramesRef = useRef<number>(0);

  const onNoteOnRef = useRef(onNoteOn);
  onNoteOnRef.current = onNoteOn;
  const onNoteOffRef = useRef(onNoteOff);
  onNoteOffRef.current = onNoteOff;

  const stopListening = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    if (activePitchRef.current !== null) {
      onNoteOffRef.current?.(activePitchRef.current);
      activePitchRef.current = null;
    }
    candidatePitchRef.current = null;
    candidateFramesRef.current = 0;
    silenceFramesRef.current = 0;
    setActiveNotes(new Set());
    setCurrentResult(null);
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    stopListening();
    setError(null);

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone input is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 500;
      filter.Q.value = 0.5;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      source.connect(filter);
      filter.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      setIsListening(true);

      const loop = () => {
        if (!analyserRef.current || !audioCtxRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);

        const result = detectPitchFromSamples(
          buffer,
          audioCtxRef.current.sampleRate,
          rmsThreshold,
          0.65
        );

        if (result) {
          silenceFramesRef.current = 0;
          setCurrentResult(result);

          if (result.pitch === candidatePitchRef.current) {
            candidateFramesRef.current++;
          } else {
            candidatePitchRef.current = result.pitch;
            candidateFramesRef.current = 1;
          }

          // Stable for 3 consecutive analysis cycles (~45ms)
          if (candidateFramesRef.current >= 3 && activePitchRef.current !== result.pitch) {
            if (activePitchRef.current !== null) {
              onNoteOffRef.current?.(activePitchRef.current);
            }
            activePitchRef.current = result.pitch;
            const velocity = Math.min(120, Math.max(50, Math.round(result.rms * 600)));
            onNoteOnRef.current?.(result.pitch, velocity);
            setActiveNotes(new Set([result.pitch]));
          }
        } else {
          // Silence or below energy threshold
          silenceFramesRef.current++;
          if (silenceFramesRef.current >= 4 && activePitchRef.current !== null) {
            onNoteOffRef.current?.(activePitchRef.current);
            activePitchRef.current = null;
            candidatePitchRef.current = null;
            candidateFramesRef.current = 0;
            setActiveNotes(new Set());
            setCurrentResult(null);
          }
        }

        rafIdRef.current = requestAnimationFrame(loop);
      };

      rafIdRef.current = requestAnimationFrame(loop);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to access microphone.";
      setError(msg);
      stopListening();
    }
  }, [rmsThreshold, stopListening]);

  useEffect(() => {
    if (enabled) {
      void startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [enabled, startListening, stopListening]);

  return {
    isListening,
    activeNotes,
    currentResult,
    error,
    startListening,
    stopListening,
  };
}
