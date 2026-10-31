"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { createClient } from "@/lib/supabase";
import { api, type Project, type OutputFile, type Job, type JobBrief } from "@/lib/api";
import { PianoSynth } from "@/lib/pianoSynth";
import { simplifyNoteData } from "@/lib/midi/simplifyEngine";
import type { NoteData, RenderSettings } from "@pianoflow/shared-types";

export type ExportTab = "video" | "sheet" | "midi" | "audio";

export interface VideoExportOptions {
  aspectRatio: "16:9" | "9:16";
  resolution: "720p" | "1080p";
  fps: 30 | 60;
  difficulty: "original" | "easy";
}

export interface ExportCenterModalProps {
  open?: boolean;
  isOpen?: boolean;
  project?: Project | null;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  durationSec?: number;
  totalNotes?: number;
  settings?: RenderSettings | null;
  activeSettings?: RenderSettings;
  filteredNoteData?: NoteData;
  outputs?: OutputFile[];
  jobs?: {
    sheet?: Job | JobBrief | null;
    video?: Job | JobBrief | null;
    simplify?: Job | JobBrief | null;
    active?: Job | JobBrief | null;
  };
  token?: string | null;
  onRenderVideo?: (options?: VideoExportOptions) => Promise<void> | void;
  onRenderSheet?: () => Promise<void> | void;
  onSimplifyMidi?: () => Promise<void> | void;
}

function writeVlq(val: number): number[] {
  const bytes: number[] = [];
  bytes.push(val & 0x7f);
  let v = val;
  while ((v >>= 7) > 0) {
    bytes.push((v & 0x7f) | 0x80);
  }
  return bytes.reverse();
}

/**
 * Builds a standard SMF Type 0 MIDI file in pure JavaScript with dynamic meter, CC64 sustain, and clean event ordering.
 */
function createMidiBlob(noteData: NoteData): Blob {
  const bpm = noteData.bpm > 0 ? noteData.bpm : 120;
  const ppq = 480;
  const usPerBeat = Math.round(60_000_000 / bpm);
  const trackEvents: number[] = [];

  // Set Tempo Meta Event (FF 51 03) at delta 0
  trackEvents.push(
    ...writeVlq(0),
    0xff,
    0x51,
    0x03,
    (usPerBeat >> 16) & 0xff,
    (usPerBeat >> 8) & 0xff,
    usPerBeat & 0xff
  );

  // Dynamic Time Signature Meta Event (FF 58 04 nn dd cc bb) at delta 0
  const ts = noteData.time_signature || "4/4";
  const num = parseInt(ts.split("/")[0], 10) || 4;
  const rawDenom = parseInt(ts.split("/")[1], 10) || 4;
  const denomExp = Math.max(0, Math.round(Math.log2(rawDenom)));
  trackEvents.push(...writeVlq(0), 0xff, 0x58, 0x04, num, denomExp, 0x18, 0x08);

  // Build sorted list of NoteOn, NoteOff, and CC64 Sustain events
  const events: Array<{ tick: number; type: number; pitch: number; vel: number }> = [];
  for (const n of noteData.notes) {
    const startTick = Math.max(0, Math.round(n.start * (bpm / 60) * ppq));
    const endTick = Math.max(startTick + 1, Math.round(n.end * (bpm / 60) * ppq));
    events.push({
      tick: startTick,
      type: 0x90,
      pitch: Math.min(127, Math.max(0, n.pitch)),
      vel: Math.min(127, Math.max(1, n.velocity || 80)),
    });
    events.push({
      tick: endTick,
      type: 0x80,
      pitch: Math.min(127, Math.max(0, n.pitch)),
      vel: 0,
    });
  }

  // CC64 Sustain Pedal Events
  if (noteData.sustain && noteData.sustain.length > 0) {
    for (const s of noteData.sustain) {
      if ("time" in s && typeof (s as { time: number; value: number }).value === "number") {
        const tick = Math.max(0, Math.round((s as { time: number; value: number }).time * (bpm / 60) * ppq));
        events.push({
          tick,
          type: 0xb0,
          pitch: 0x40, // CC64 Damper/Sustain
          vel: Math.min(127, Math.max(0, (s as { time: number; value: number }).value)),
        });
      } else if ("start" in s && "end" in s) {
        const startTick = Math.max(0, Math.round((s as { start: number; end: number }).start * (bpm / 60) * ppq));
        const endTick = Math.max(startTick + 1, Math.round((s as { start: number; end: number }).end * (bpm / 60) * ppq));
        events.push({
          tick: startTick,
          type: 0xb0,
          pitch: 0x40,
          vel: 0x7f,
        });
        events.push({
          tick: endTick,
          type: 0xb0,
          pitch: 0x40,
          vel: 0x00,
        });
      }
    }
  }

  // Event Sorting:
  // On simultaneous ticks, NoteOff (0x80) precedes NoteOn (0x90) for the same pitch so release is never swallowed.
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    const priority = (type: number, vel: number) => {
      if (type === 0x80 || (type === 0x90 && vel === 0)) return 1; // NoteOff first
      if (type === 0xb0) return 2; // Control Change (pedal)
      return 3; // NoteOn with vel > 0
    };
    const pA = priority(a.type, a.vel);
    const pB = priority(b.type, b.vel);
    if (pA !== pB) return pA - pB;
    return a.pitch - b.pitch;
  });

  let lastTick = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    trackEvents.push(...writeVlq(delta), ev.type, ev.pitch, ev.vel);
    lastTick = ev.tick;
  }

  // End of Track Meta Event (FF 2F 00) at delta 0
  trackEvents.push(...writeVlq(0), 0xff, 0x2f, 0x00);

  // MThd header chunk: format 0, 1 track, PPQ
  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // length 6
    0x00, 0x00,             // format 0
    0x00, 0x01,             // 1 track
    (ppq >> 8) & 0xff, ppq & 0xff,
  ];

  // MTrk chunk header
  const trackLen = trackEvents.length;
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ];

  const fullBytes = new Uint8Array([...header, ...trackHeader, ...trackEvents]);
  return new Blob([fullBytes], { type: "audio/midi" });
}

export function ExportCenterModal({
  open,
  isOpen,
  project,
  onClose,
  projectId = project?.id ?? "",
  projectName = project?.name ?? "Untitled Project",
  durationSec = project?.analysis_summary?.duration_sec ?? 0,
  totalNotes = project?.analysis_summary?.note_count ?? 0,
  settings,
  filteredNoteData,
  outputs = [],
  jobs,
  onRenderVideo,
  onRenderSheet,
  onSimplifyMidi,
}: ExportCenterModalProps) {
  const isModalOpen = isOpen !== undefined ? isOpen : (open ?? false);
  const [activeTab, setActiveTab] = useState<ExportTab>("video");

  // Track active project ID (repertoire slug or user project UUID)
  const [activeProjectId, setActiveProjectId] = useState<string>(projectId);
  useEffect(() => {
    setActiveProjectId(projectId);
  }, [projectId]);

  const isCatalogSong = useMemo(() => {
    return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeProjectId);
  }, [activeProjectId]);

  // Local outputs and jobs state for self-contained polling when activeProjectId is a UUID
  const [localOutputs, setLocalOutputs] = useState<OutputFile[]>(outputs);
  const [localJobs, setLocalJobs] = useState(jobs);
  const [authError, setAuthError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  useEffect(() => {
    setLocalOutputs(outputs);
  }, [outputs]);

  useEffect(() => {
    setLocalJobs(jobs);
  }, [jobs]);

  // Video Export Controls
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">(
    (settings?.resolution as "720p" | "1080p") ?? "720p"
  );
  const [fps, setFps] = useState<30 | 60>(
    (settings?.fps as 30 | 60) ?? 30
  );
  const [difficulty, setDifficulty] = useState<"original" | "easy">(
    (settings?.difficulty as "original" | "easy") ?? "original"
  );

  // Video Streaming State
  const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // Download Trigger State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Share Link State
  const [copiedLink, setCopiedLink] = useState(false);

  // Audio Synth Preview State
  const synthRef = useRef<PianoSynth | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Stop audio on close / unmount
  useEffect(() => {
    if (!open && isPlayingAudio) {
      synthRef.current?.stop();
      setIsPlayingAudio(false);
    }
  }, [open, isPlayingAudio]);

  useEffect(() => {
    return () => {
      synthRef.current?.stop();
    };
  }, []);

  // Poll outputs and jobs when activeProjectId is a valid UUID
  useEffect(() => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeProjectId);
    if (!isModalOpen || !isUuid) return;

    let isMounted = true;
    const poll = async () => {
      try {
        const [outputsRes, projRes] = await Promise.all([
          api.listOutputs(activeProjectId).catch(() => null),
          api.getProject(activeProjectId).catch(() => null),
        ]);
        if (!isMounted) return;
        if (outputsRes?.items) {
          setLocalOutputs(outputsRes.items);
        }
        if (projRes?.active_jobs) {
          const sheetJob = projRes.active_jobs.find((j) => j.job_type === "render_sheet");
          const videoJob = projRes.active_jobs.find((j) => j.job_type === "render_video");
          const simplifyJob = projRes.active_jobs.find((j) => j.job_type === "simplify_midi");
          setLocalJobs({
            sheet: sheetJob ?? null,
            video: videoJob ?? null,
            simplify: simplifyJob ?? null,
          });
        }
      } catch {
        // Polling network fallback
      }
    };

    void poll();
    const interval = setInterval(poll, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isModalOpen, activeProjectId]);

  const effectiveOutputs = useMemo(() => {
    return localOutputs.length > 0 ? localOutputs : outputs;
  }, [localOutputs, outputs]);

  const effectiveJobs = useMemo(() => {
    return {
      ...jobs,
      ...localJobs,
    };
  }, [jobs, localJobs]);

  // Find relevant outputs
  const videoOutput = useMemo(() => {
    if (aspectRatio === "9:16") {
      return (
        effectiveOutputs.find((o) => o.kind === "vertical_video_mp4") ??
        effectiveOutputs.find((o) => o.kind === "video_mp4")
      );
    }
    return effectiveOutputs.find((o) => o.kind === "video_mp4");
  }, [effectiveOutputs, aspectRatio]);

  const pdfOutput = useMemo(
    () => effectiveOutputs.find((o) => o.kind === "sheet_pdf"),
    [effectiveOutputs]
  );
  const musicxmlOutput = useMemo(
    () => effectiveOutputs.find((o) => o.kind === "sheet_musicxml"),
    [effectiveOutputs]
  );
  const originalMidiOutput = useMemo(
    () => effectiveOutputs.find((o) => o.kind === "original_midi"),
    [effectiveOutputs]
  );
  const simplifiedMidiOutput = useMemo(
    () => effectiveOutputs.find((o) => o.kind === "simplified_midi"),
    [effectiveOutputs]
  );
  const wavAudioOutput = useMemo(
    () => effectiveOutputs.find((o) => o.kind === "audio_wav"),
    [effectiveOutputs]
  );
  const mp3AudioOutput = useMemo(
    () => effectiveOutputs.find((o) => o.kind === "audio_mp3"),
    [effectiveOutputs]
  );

  const isVideoJobRunning =
    effectiveJobs?.video?.status === "queued" || effectiveJobs?.video?.status === "processing";
  const isSheetJobRunning =
    effectiveJobs?.sheet?.status === "queued" || effectiveJobs?.sheet?.status === "processing";
  const isSimplifyJobRunning =
    effectiveJobs?.simplify?.status === "queued" || effectiveJobs?.simplify?.status === "processing";

  const handleDownload = async (outputId: string) => {
    try {
      setDownloadingId(outputId);
      const { download_url } = await api.createDownloadUrl(outputId);
      window.open(download_url, "_blank", "noopener");
    } catch (err) {
      console.error("Failed to mint download URL:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleWatchVideo = async () => {
    if (!videoOutput) return;
    try {
      setIsLoadingStream(true);
      const { stream_url } = await api.createStreamUrl(videoOutput.id);
      setVideoStreamUrl(stream_url);
    } catch (err) {
      console.error("Failed to load stream URL:", err);
    } finally {
      setIsLoadingStream(false);
    }
  };

  const ensureProjectForCatalog = async (
    targetJob: "video" | "sheet" | "simplify",
    videoOptions?: VideoExportOptions
  ): Promise<string | null> => {
    setAuthError(null);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAuthError("Sign in to generate full-fidelity video tutorials, engraved sheet music, and custom audio bounces.");
      return null;
    }

    try {
      setImportProgress("Creating cloud project from repertoire piece...");
      const projName = projectName || "Catalog Piece";
      const newProj = await api.createProject(projName);
      const targetId = newProj.id;

      setImportProgress("Packaging and uploading MIDI note arrangement...");
      const midiNoteData: NoteData = filteredNoteData ?? {
        schema_version: 1,
        bpm: 120,
        duration_sec: durationSec || 60,
        notes: [],
        time_signature: "4/4",
      };
      const midiBlob = createMidiBlob(midiNoteData);
      const filename = `${projName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}.mid`;
      const uploadInit = await api.initUpload(targetId, filename, midiBlob.size);
      await api.putToSignedUrl(uploadInit, midiBlob);
      await api.confirmUpload(targetId, uploadInit.upload_id);

      if (settings || videoOptions) {
        setImportProgress("Configuring rendering settings...");
        await api.patchSettings(targetId, {
          ...(settings || {}),
          ...(videoOptions
            ? {
                aspect_ratio: videoOptions.aspectRatio,
                resolution: videoOptions.resolution,
                fps: videoOptions.fps,
                difficulty: videoOptions.difficulty,
              }
            : {}),
        });
      }

      setImportProgress(
        `Enqueuing ${
          targetJob === "video"
            ? "video tutorial"
            : targetJob === "sheet"
            ? "sheet engraving"
            : "beginner arrangement"
        } job...`
      );
      let jobRes: Job | null = null;
      if (targetJob === "video") {
        jobRes = await api.enqueueRenderVideo(targetId);
      } else if (targetJob === "sheet") {
        jobRes = await api.enqueueRenderSheet(targetId);
      } else if (targetJob === "simplify") {
        jobRes = await api.enqueueSimplifyMidi(targetId);
      }

      setActiveProjectId(targetId);
      if (jobRes) {
        setLocalJobs((prev) => ({
          ...prev,
          [targetJob]: jobRes,
        }));
      }
      setImportProgress(null);
      return targetId;
    } catch (err: unknown) {
      console.error("Failed to provision catalog project:", err);
      setAuthError(
        err instanceof Error
          ? err.message
          : "Failed to provision cloud rendering for this catalog song."
      );
      setImportProgress(null);
      return null;
    }
  };

  const handleTriggerRenderVideo = async () => {
    if (onRenderVideo) {
      await onRenderVideo({ aspectRatio, resolution, fps, difficulty });
      return;
    }
    if (isCatalogSong) {
      await ensureProjectForCatalog("video", { aspectRatio, resolution, fps, difficulty });
    } else {
      const job = await api.enqueueRenderVideo(activeProjectId);
      setLocalJobs((prev) => ({ ...prev, video: job }));
    }
  };

  const handleTriggerRenderSheet = async () => {
    if (onRenderSheet) {
      await onRenderSheet();
      return;
    }
    if (isCatalogSong) {
      await ensureProjectForCatalog("sheet");
    } else {
      const job = await api.enqueueRenderSheet(activeProjectId);
      setLocalJobs((prev) => ({ ...prev, sheet: job }));
    }
  };

  const handleTriggerSimplify = async () => {
    if (onSimplifyMidi) {
      await onSimplifyMidi();
      return;
    }
    if (isCatalogSong) {
      await ensureProjectForCatalog("simplify");
    } else {
      const job = await api.enqueueSimplifyMidi(activeProjectId);
      setLocalJobs((prev) => ({ ...prev, simplify: job }));
    }
  };

  const [beginnerDifficulty, setBeginnerDifficulty] = useState<"easy" | "very_easy">("easy");

  const handleExportIsolatedMidi = () => {
    if (!filteredNoteData) return;
    try {
      const blob = createMidiBlob(filteredNoteData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      a.download = `${sanitizedName}_isolated_piano.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to create isolated MIDI:", err);
    }
  };

  const handleDownloadSimplifiedClient = () => {
    if (!filteredNoteData) return;
    try {
      const simplified = simplifyNoteData(filteredNoteData, beginnerDifficulty);
      const blob = createMidiBlob(simplified);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      a.download = `${sanitizedName}_${beginnerDifficulty}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to create simplified MIDI:", err);
    }
  };

  const toggleSynthPreview = () => {
    if (isPlayingAudio) {
      synthRef.current?.stop();
      setIsPlayingAudio(false);
    } else {
      if (!synthRef.current) {
        synthRef.current = new PianoSynth();
      }
      const notesToPlay = filteredNoteData?.notes ?? [];
      if (notesToPlay.length > 0) {
        synthRef.current.play(notesToPlay, 1.0, 0);
        setIsPlayingAudio(true);
      }
    }
  };

  const handleCopyShareLink = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? isCatalogSong
          ? `${window.location.origin}/songs?song=${encodeURIComponent(projectId)}`
          : `${window.location.origin}/projects/${activeProjectId}`
        : isCatalogSong
        ? `/songs?song=${encodeURIComponent(projectId)}`
        : `/projects/${activeProjectId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(durationSec / 60);
    const secs = String(Math.round(durationSec % 60)).padStart(2, "0");
    return `${mins}:${secs}`;
  }, [durationSec]);

  return (
    <Dialog
      open={isModalOpen}
      onClose={onClose}
      className="max-w-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 shadow-2xl rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-6 py-4.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <span className="text-violet-400">🚀</span> Export Center & Downloads
            </h2>
            <Badge className="bg-violet-950/60 text-violet-300 border-violet-800/50 text-[11px]">
              Hub
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {projectName ? (
              <span className="text-zinc-200 font-medium" data-testid="export-modal-project-title">
                {projectName} •{" "}
              </span>
            ) : null}
            Master your video tutorials, sheet music, MIDI files, and audio bounces
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close export dialog"
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          ✕
        </button>
      </div>

      {/* Tabs Bar */}
      <div
        role="tablist"
        aria-label="Export categories"
        className="flex border-b border-zinc-800 bg-zinc-900/40 px-6 gap-2 overflow-x-auto"
      >
        {(
          [
            { id: "video", label: "Video Tutorial 🎬" },
            { id: "sheet", label: "Sheet Music 🎼" },
            { id: "midi", label: "MIDI Files 🎹" },
            { id: "audio", label: "Audio Bounce 🎧" },
          ] as const
        ).map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 focus:outline-none ${
                isSelected
                  ? "border-violet-500 text-violet-300 bg-violet-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-6 max-h-[68vh] overflow-y-auto">
        {/* Auth Error Banner */}
        {authError && (
          <div
            data-testid="export-auth-error-banner"
            className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-lg">🔒</span>
              <div>
                <h4 className="text-xs font-bold text-amber-300">Account Required for Cloud Rendering</h4>
                <p className="text-xs text-amber-200/90 mt-0.5">{authError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/login?redirect=${encodeURIComponent(`/songs?song=${projectId}`)}`}
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm"
              >
                Sign In / Sign Up
              </a>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="text-xs text-amber-400/80 hover:text-amber-200 p-1"
                aria-label="Dismiss auth error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Import & Provisioning Progress */}
        {importProgress && (
          <div
            data-testid="export-import-progress-banner"
            className="mb-6 p-3.5 rounded-xl bg-violet-950/40 border border-violet-700/50 flex items-center gap-3 text-violet-200 text-xs"
          >
            <span className="animate-spin text-base">⚙️</span>
            <div className="flex-1">
              <span className="font-semibold text-violet-100">{importProgress}</span>
              <div className="h-1 w-full bg-violet-900/60 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-violet-400 animate-[pulse_1s_ease-in-out_infinite] w-2/3" />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 1: VIDEO ── */}
        {activeTab === "video" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center justify-between">
                <span>Tutorial Video Settings</span>
                <span className="text-xs font-normal text-zinc-400">
                  {formattedDuration} • {totalNotes} notes
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure Synthesia-style falling note tutorial videos with hand lighting & hit glow.
              </p>
            </div>

            {/* Aspect Ratio Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setAspectRatio("16:9")}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  aspectRatio === "16:9"
                    ? "border-violet-500/80 bg-violet-950/30 ring-1 ring-violet-500/50"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                    🖥️ 16:9 Landscape
                  </span>
                  {aspectRatio === "16:9" && (
                    <Badge className="bg-violet-500 text-white border-none text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">
                  Standard format for YouTube, TV, tablets & desktop monitors.
                </p>
                <div className="mt-3 text-[11px] text-zinc-500">1280×720 / 1920×1080</div>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio("9:16")}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  aspectRatio === "9:16"
                    ? "border-cyan-500/80 bg-cyan-950/30 ring-1 ring-cyan-500/50"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                    📱 9:16 Vertical
                  </span>
                  {aspectRatio === "9:16" && (
                    <Badge className="bg-cyan-500 text-zinc-950 font-bold border-none text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">
                  Optimized for YouTube Shorts, TikTok, and Instagram Reels.
                </p>
                <div className="mt-3 text-[11px] text-zinc-500">720×1280 / 1080×1920</div>
              </button>
            </div>

            {/* Quality & Arrangement Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3.5">
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as "720p" | "1080p")}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="720p">720p HD (Fast)</option>
                  <option value="1080p">1080p Full HD (Crisp)</option>
                </select>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3.5">
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                  Framerate
                </label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value) as 30 | 60)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value={30}>30 FPS (Standard)</option>
                  <option value={60}>60 FPS (Silky Smooth)</option>
                </select>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3.5">
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                  Arrangement
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "original" | "easy")}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="original">Original Score</option>
                  <option value="easy">Beginner Simplified</option>
                </select>
              </div>
            </div>

            {/* Video Rendering Progress */}
            {isVideoJobRunning && (
              <div className="p-4 rounded-xl border border-violet-800/40 bg-violet-950/20 space-y-2">
                <div className="flex justify-between text-xs text-violet-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="animate-spin inline-block">⚙️</span>
                    Rendering Video...
                  </span>
                  <span>{effectiveJobs?.video?.progress ?? 0}%</span>
                </div>
                <Progress value={effectiveJobs?.video?.progress ?? 0} />
                <p className="text-[11px] text-zinc-400">
                  {effectiveJobs?.video?.progress_message ?? "Drawing falling notes and keyboard frames..."}
                </p>
              </div>
            )}

            {/* Video Actions & Preview */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Status:</span>
                {videoOutput ? (
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800">
                    Ready
                  </Badge>
                ) : isVideoJobRunning ? (
                  <Badge className="bg-amber-950 text-amber-300 border-amber-800">
                    Rendering...
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">
                    Not Rendered
                  </Badge>
                )}
                {videoOutput && (
                  <div className="hidden sm:flex gap-1.5 text-[10px] text-zinc-500 ml-2">
                    <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      H.264
                    </span>
                    <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      AAC 44.1kHz
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {videoOutput && (
                  <Button
                    variant="primary"
                    onClick={handleWatchVideo}
                    disabled={isLoadingStream}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3.5"
                  >
                    {isLoadingStream ? "Loading..." : "▶ Watch Tutorial"}
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleTriggerRenderVideo}
                  disabled={isVideoJobRunning}
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs py-2 px-3.5"
                >
                  {isVideoJobRunning ? "Rendering..." : "⚡ Render Video"}
                </Button>
              </div>
            </div>

            {/* Inline Streaming Player */}
            {videoStreamUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-zinc-800 bg-black p-2">
                <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-400">
                  <span>Streaming Video Player</span>
                  <button
                    onClick={() => setVideoStreamUrl(null)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    ✕ Close Player
                  </button>
                </div>
                <video
                  src={videoStreamUrl}
                  controls
                  autoPlay
                  className="w-full max-h-80 rounded-lg bg-black"
                />
              </div>
            )}

            {/* Policy 12 Notice */}
            <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/60 p-3 text-[11px] text-zinc-400 flex items-start gap-2">
              <span className="text-zinc-300">🔒</span>
              <div>
                <span className="font-medium text-zinc-300">
                  Streaming Protection (Policy 12):
                </span>{" "}
                Tutorial videos are streamed through high-speed signed CDN URLs and cannot be directly downloaded to preserve content integrity.
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: SHEET MUSIC ── */}
        {activeTab === "sheet" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Printable & Digital Sheet Music
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Grand staff notation engraved directly from musical note timing and pitches.
              </p>
            </div>

            {isSheetJobRunning && (
              <div className="p-4 rounded-xl border border-cyan-800/40 bg-cyan-950/20 space-y-2">
                <div className="flex justify-between text-xs text-cyan-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="animate-spin inline-block">⚙️</span>
                    Rendering Sheet Music...
                  </span>
                  <span>{effectiveJobs?.sheet?.progress ?? 0}%</span>
                </div>
                <Progress value={effectiveJobs?.sheet?.progress ?? 0} />
                <p className="text-[11px] text-zinc-400">
                  {effectiveJobs?.sheet?.progress_message ?? "Formatting measures and staff lines..."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PDF Score Card */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                      📄 Grand Staff PDF
                    </h4>
                    {pdfOutput ? (
                      <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                        Ready
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                        Not Generated
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Vector-engraved Grand Staff score formatted for standard 8.5×11 Letter & A4 printing. Features treble and bass clefs, dynamic ledger lines, measure numbers, and song header.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  {pdfOutput ? (
                    <Button
                      variant="primary"
                      onClick={() => handleDownload(pdfOutput.id)}
                      disabled={downloadingId === pdfOutput.id}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2"
                    >
                      {downloadingId === pdfOutput.id ? "Preparing..." : "Download PDF 📥"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleTriggerRenderSheet}
                      disabled={isSheetJobRunning}
                      className="w-full text-xs py-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Generate PDF
                    </Button>
                  )}
                </div>
              </div>

              {/* MusicXML Card */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                      🎼 Universal MusicXML
                    </h4>
                    {musicxmlOutput ? (
                      <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                        Ready
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                        Not Generated
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Open notation interchange format compatible with MuseScore, Sibelius, Finale, and Dorico.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  {musicxmlOutput ? (
                    <Button
                      variant="primary"
                      onClick={() => handleDownload(musicxmlOutput.id)}
                      disabled={downloadingId === musicxmlOutput.id}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2"
                    >
                      {downloadingId === musicxmlOutput.id ? "Preparing..." : "Download MusicXML 📥"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleTriggerRenderSheet}
                      disabled={isSheetJobRunning}
                      className="w-full text-xs py-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Generate MusicXML
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Sheet Viewer Link */}
            <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-xs text-cyan-200">
                  Interactive Web Score Viewer
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Play along with acoustic microphone note detection or Web MIDI.
                </p>
              </div>
              <a
                href={
                  isCatalogSong
                    ? `/songs?song=${encodeURIComponent(projectId)}`
                    : `/projects/${activeProjectId}/sheet`
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-medium text-xs transition-colors"
              >
                Open Score Viewer 🎼
              </a>
            </div>
          </div>
        )}

        {/* ── TAB 3: MIDI FILES ── */}
        {activeTab === "midi" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Standard MIDI Files (SMF)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Export MIDI arrangements compatible with any DAW, Synthesia, or hardware keyboard.
              </p>
            </div>

            {isSimplifyJobRunning && (
              <div className="p-4 rounded-xl border border-amber-800/40 bg-amber-950/20 space-y-2">
                <div className="flex justify-between text-xs text-amber-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="animate-spin inline-block">⚙️</span>
                    Simplifying MIDI...
                  </span>
                  <span>{effectiveJobs?.simplify?.progress ?? 0}%</span>
                </div>
                <Progress value={effectiveJobs?.simplify?.progress ?? 0} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Original MIDI */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    🎹 Original MIDI
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Unaltered source MIDI file with original track and tempo structure.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                      {totalNotes} notes
                    </Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                      {formattedDuration}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  {originalMidiOutput ? (
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(originalMidiOutput.id)}
                      disabled={downloadingId === originalMidiOutput.id}
                      className="w-full text-xs py-1.5 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    >
                      {downloadingId === originalMidiOutput.id ? "Preparing..." : "Download MIDI 📥"}
                    </Button>
                  ) : (
                    <span className="text-[11px] text-zinc-500 block text-center">
                      Embedded in project
                    </span>
                  )}
                </div>
              </div>

              {/* Simplified MIDI */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                      🌱 Beginner MIDI
                    </h4>
                    <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/50 text-[10px]">
                      ⚡ Instant Client Generation
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Melody-preserving reduced arrangement with capped note density and isolated root bass.
                  </p>

                  {/* Difficulty selector pill */}
                  <div className="mt-3 flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 w-fit">
                    <button
                      type="button"
                      data-testid="beginner-midi-diff-easy"
                      onClick={() => setBeginnerDifficulty("easy")}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded transition ${
                        beginnerDifficulty === "easy"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Easy 🟢
                    </button>
                    <button
                      type="button"
                      data-testid="beginner-midi-diff-very_easy"
                      onClick={() => setBeginnerDifficulty("very_easy")}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded transition ${
                        beginnerDifficulty === "very_easy"
                          ? "bg-amber-950 text-amber-300 border border-amber-700/60 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Very Easy 🟡
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-2">
                  <Button
                    variant="primary"
                    data-testid="btn-download-simplified-midi"
                    onClick={handleDownloadSimplifiedClient}
                    disabled={!filteredNoteData || filteredNoteData.notes.length === 0}
                    className="w-full text-xs py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
                  >
                    Download {beginnerDifficulty === "easy" ? "Easy" : "Very Easy"} MIDI ⚡
                  </Button>

                  {simplifiedMidiOutput ? (
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(simplifiedMidiOutput.id)}
                      disabled={downloadingId === simplifiedMidiOutput.id}
                      className="w-full text-xs py-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Server Rendered MIDI 📥
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerSimplify}
                      disabled={isSimplifyJobRunning}
                      className="w-full text-[11px] text-zinc-400 hover:text-zinc-300 underline py-0.5"
                    >
                      {isSimplifyJobRunning ? "Worker processing..." : "Queue Server Job"}
                    </button>
                  )}
                </div>
              </div>

              {/* Isolated Piano MIDI */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    🎯 Isolated Piano MIDI
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Clean solo piano export retaining only active keyboard tracks (drums & bass excluded).
                  </p>
                  <div className="mt-3">
                    <Badge className="bg-violet-950 text-violet-300 border-violet-800 text-[10px]">
                      {filteredNoteData?.notes.length ?? totalNotes} notes
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  <Button
                    variant="primary"
                    onClick={handleExportIsolatedMidi}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs py-1.5 font-medium"
                  >
                    Export Isolated MIDI 🎹
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: AUDIO BOUNCE ── */}
        {activeTab === "audio" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Acoustic Grand Piano Bounce
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Studio-grade stereo audio render powered by FluidSynth and FluidR3_GM SoundFont.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* WAV Bounce */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                      🎧 Studio WAV Bounce
                    </h4>
                    {wavAudioOutput ? (
                      <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                        Ready
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                        Available via Render
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Lossless 44.1 kHz 16-bit stereo PCM rendered with Steinway acoustic grand samples.
                  </p>
                  <div className="mt-3 flex gap-1.5 text-[10px] text-zinc-500">
                    <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      44.1 kHz PCM
                    </span>
                    <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      16-bit Stereo
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  {wavAudioOutput ? (
                    <Button
                      variant="primary"
                      onClick={() => handleDownload(wavAudioOutput.id)}
                      disabled={downloadingId === wavAudioOutput.id}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs py-2"
                    >
                      Download WAV 📥
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleTriggerRenderVideo}
                      className="w-full text-xs py-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Render Video Audio
                    </Button>
                  )}
                </div>
              </div>

              {/* MP3 Bounce */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                      📻 Standard MP3 Bounce
                    </h4>
                    {mp3AudioOutput ? (
                      <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                        Ready
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                        Available via Render
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Broadcast quality 320 kbps compressed audio for quick listening and mobile streaming.
                  </p>
                  <div className="mt-3 flex gap-1.5 text-[10px] text-zinc-500">
                    <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      320 kbps CBR
                    </span>
                    <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      Joint Stereo
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  {mp3AudioOutput ? (
                    <Button
                      variant="primary"
                      onClick={() => handleDownload(mp3AudioOutput.id)}
                      disabled={downloadingId === mp3AudioOutput.id}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs py-2"
                    >
                      Download MP3 📥
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleTriggerRenderVideo}
                      className="w-full text-xs py-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Render Video Audio
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Inline Web Audio Synth Preview */}
            <div className="rounded-xl border border-violet-800/40 bg-violet-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-xs text-violet-200 flex items-center gap-2">
                  🎹 Instant In-Browser Piano Preview
                  {isPlayingAudio && (
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Lightweight dual-oscillator acoustic preview at 1.0x tempo directly from memory.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={toggleSynthPreview}
                className={`text-xs py-1.5 px-3 border-violet-500/50 ${
                  isPlayingAudio
                    ? "bg-red-950/50 text-red-300 border-red-800"
                    : "text-violet-300 hover:bg-violet-950/40"
                }`}
              >
                {isPlayingAudio ? "⏹ Stop Preview" : "▶ Play Preview"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer & Share Project Link */}
      <div className="border-t border-zinc-800/80 bg-zinc-900/60 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-zinc-400 whitespace-nowrap">🔗 Share:</span>
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 max-w-xs overflow-hidden">
            <span className="truncate">
              {typeof window !== "undefined"
                ? isCatalogSong
                  ? `${window.location.origin}/songs?song=${encodeURIComponent(projectId)}`
                  : `${window.location.origin}/projects/${activeProjectId}`
                : isCatalogSong
                ? `/songs?song=${encodeURIComponent(projectId)}`
                : `/projects/${activeProjectId}`}
            </span>
            <button
              onClick={handleCopyShareLink}
              title="Copy share link"
              className="ml-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {copiedLink ? "✓" : "📋"}
            </button>
          </div>
          {copiedLink && (
            <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs py-1.5 px-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Close Dialog
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
