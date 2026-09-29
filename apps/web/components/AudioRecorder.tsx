"use client";

import { useState, useRef, useEffect } from "react";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

const MAX_DURATION_SEC = 5 * 60;

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION_SEC - 1) {
            stopRecording();
            return MAX_DURATION_SEC;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    setErrorMsg(null);
    setRecordingTime(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        onRecordingComplete(file);
        
        // Stop all tracks to release the mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Could not start recording.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-zinc-500">…or record audio directly:</p>
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
            Record Audio
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/50 px-5 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            Stop Recording
          </button>
        )}
        
        {isRecording && (
          <span className="text-sm font-medium text-red-400 tabular-nums">
            {formatTime(recordingTime)} / {formatTime(MAX_DURATION_SEC)}
          </span>
        )}
      </div>

      {errorMsg && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
