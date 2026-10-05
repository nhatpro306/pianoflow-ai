"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  type TrackMetadata,
  type TrackFilterSettings,
  detectPianoTracks,
  getDefaultTrackSettings,
} from "@/lib/midi/trackFilter";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function pitchToNoteName(pitch: number): string {
  if (pitch < 0 || pitch > 127) return `${pitch}`;
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[pitch % 12];
  return `${name}${octave}`;
}

export interface TrackSelectorProps {
  open: boolean;
  onClose: () => void;
  tracks: TrackMetadata[];
  settings: TrackFilterSettings;
  onApplySettings: (settings: TrackFilterSettings) => void;
  totalNotesCount?: number;
}

export function TrackSelector({
  open,
  onClose,
  tracks,
  settings,
  onApplySettings,
  totalNotesCount,
}: TrackSelectorProps) {
  const [draft, setDraft] = useState<TrackFilterSettings>(settings);

  // Sync draft whenever modal is opened with new settings
  useEffect(() => {
    if (open) {
      setDraft(settings);
    }
  }, [open, settings]);

  const totalCalculatedNotes = useMemo(() => {
    if (typeof totalNotesCount === "number" && totalNotesCount > 0) {
      return totalNotesCount;
    }
    return tracks.reduce((acc, t) => acc + t.noteCount, 0);
  }, [tracks, totalNotesCount]);

  // Compute active notes count under draft settings
  const activeNotesCount = useMemo(() => {
    let activeIndices: number[] = [];
    if (draft.soloTrackIndex !== null) {
      activeIndices = [draft.soloTrackIndex];
    } else {
      activeIndices = draft.selectedTrackIndices.filter(
        (idx) => !draft.mutedTrackIndices.includes(idx)
      );
    }

    return tracks.reduce((sum, t) => {
      if (!activeIndices.includes(t.index)) return sum;
      if (t.isDrum && !draft.includeDrums) return sum;
      return sum + t.noteCount;
    }, 0);
  }, [tracks, draft]);

  const activeTracksCount = useMemo(() => {
    if (draft.soloTrackIndex !== null) return 1;
    return draft.selectedTrackIndices.filter(
      (idx) => !draft.mutedTrackIndices.includes(idx)
    ).length;
  }, [draft]);

  // Handlers for quick presets
  const handleSelectAll = () => {
    setDraft({
      selectedTrackIndices: tracks.map((t) => t.index),
      mutedTrackIndices: [],
      soloTrackIndex: null,
      includeDrums: true,
    });
  };

  const handleSoloPiano = () => {
    const pianoTracks = detectPianoTracks(tracks);
    const soloIdx = pianoTracks.length > 0 ? pianoTracks[0] : (tracks[0]?.index ?? 0);
    setDraft({
      selectedTrackIndices: [soloIdx],
      mutedTrackIndices: [],
      soloTrackIndex: soloIdx,
      includeDrums: false,
    });
  };

  const handleMuteDrums = () => {
    const drumTrackIndices = tracks.filter((t) => t.isDrum).map((t) => t.index);
    setDraft((prev) => ({
      ...prev,
      includeDrums: false,
      selectedTrackIndices: prev.selectedTrackIndices.filter(
        (i) => !drumTrackIndices.includes(i)
      ),
      mutedTrackIndices: Array.from(new Set([...prev.mutedTrackIndices, ...drumTrackIndices])),
    }));
  };

  const handleReset = () => {
    setDraft(getDefaultTrackSettings(tracks));
  };

  // Per-track toggles
  const handleToggleTrack = (trackIndex: number) => {
    setDraft((prev) => {
      const isSelected = prev.selectedTrackIndices.includes(trackIndex);
      const nextSelected = isSelected
        ? prev.selectedTrackIndices.filter((i) => i !== trackIndex)
        : [...prev.selectedTrackIndices, trackIndex];

      // If this track was soloed and is now unchecked, remove solo
      const nextSolo = prev.soloTrackIndex === trackIndex && isSelected ? null : prev.soloTrackIndex;

      return {
        ...prev,
        selectedTrackIndices: nextSelected,
        soloTrackIndex: nextSolo,
      };
    });
  };

  const handleToggleSolo = (trackIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      soloTrackIndex: prev.soloTrackIndex === trackIndex ? null : trackIndex,
      // If soloing a track, ensure it's selected
      selectedTrackIndices:
        prev.soloTrackIndex === trackIndex
          ? prev.selectedTrackIndices
          : Array.from(new Set([...prev.selectedTrackIndices, trackIndex])),
    }));
  };

  const handleToggleMute = (trackIndex: number) => {
    setDraft((prev) => {
      const isMuted = prev.mutedTrackIndices.includes(trackIndex);
      const nextMuted = isMuted
        ? prev.mutedTrackIndices.filter((i) => i !== trackIndex)
        : [...prev.mutedTrackIndices, trackIndex];

      // If muted track was soloed, clear solo
      const nextSolo = prev.soloTrackIndex === trackIndex && !isMuted ? null : prev.soloTrackIndex;

      return {
        ...prev,
        mutedTrackIndices: nextMuted,
        soloTrackIndex: nextSolo,
      };
    });
  };

  const handleApply = () => {
    onApplySettings(draft);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="🎛️ Multi-Track MIDI Track Isolation & Filtering"
      className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100"
    >
      <div className="space-y-4">
        <p className="text-xs text-zinc-400">
          Isolate piano melodies, mute background instruments, or practice solo parts.
        </p>

        {/* Quick Action Presets */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-zinc-800/80">
          <Button size="sm" variant="outline" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSoloPiano}
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40"
          >
            Solo Piano Melody 🎹
          </Button>
          <Button size="sm" variant="outline" onClick={handleMuteDrums}>
            Mute Drums 🥁
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} className="text-zinc-400">
            Reset
          </Button>
        </div>

        {/* Tracks List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Tracks ({tracks.length} Available)
          </div>

          {tracks.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500 rounded-lg border border-zinc-800">
              No tracks detected in this piece.
            </div>
          ) : (
            tracks.map((track) => {
              const isSoloed = draft.soloTrackIndex === track.index;
              const isMuted = draft.mutedTrackIndices.includes(track.index);
              const isSelected = draft.selectedTrackIndices.includes(track.index);
              const isEffectivelyActive =
                draft.soloTrackIndex !== null
                  ? isSoloed
                  : isSelected && !isMuted && (!track.isDrum || draft.includeDrums);

              let cardBg = "bg-zinc-900/80 border-zinc-800 text-zinc-100";
              if (isSoloed) {
                cardBg =
                  "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-100";
              } else if (isMuted) {
                cardBg = "bg-zinc-950/60 border-zinc-900 opacity-60 text-zinc-500 line-through";
              } else if (track.isDrum && !isEffectivelyActive) {
                cardBg = "bg-amber-950/20 border-amber-900/30 text-amber-300/70";
              }

              return (
                <div
                  key={track.index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${cardBg}`}
                >
                  {/* Left: Checkbox, Icon, Track details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      id={`track-checkbox-${track.index}`}
                      checked={isSelected || isSoloed}
                      onChange={() => handleToggleTrack(track.index)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 accent-cyan-500 cursor-pointer"
                      aria-label={`Select ${track.name}`}
                    />

                    <div className="text-xl shrink-0 select-none">{track.icon}</div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`track-checkbox-${track.index}`}
                          className="text-sm font-semibold truncate cursor-pointer hover:text-white"
                        >
                          {track.name}
                        </label>
                        {track.isDrum && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                            Drums
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span>{track.noteCount} Notes</span>
                        <span>•</span>
                        <span>
                          Pitch: {pitchToNoteName(track.pitchMin)} –{" "}
                          {pitchToNoteName(track.pitchMax)}
                        </span>
                        {track.durationSec > 0 && (
                          <>
                            <span>•</span>
                            <span>{track.durationSec}s</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Solo [S] & Mute [M] buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSolo(track.index)}
                      title={isSoloed ? "Disable Solo" : "Solo Track"}
                      className={`w-7 h-7 rounded text-xs font-bold transition flex items-center justify-center ${
                        isSoloed
                          ? "bg-cyan-500 text-zinc-950 shadow-md ring-2 ring-cyan-400/50"
                          : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700/50"
                      }`}
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleMute(track.index)}
                      title={isMuted ? "Unmute Track" : "Mute Track"}
                      className={`w-7 h-7 rounded text-xs font-bold transition flex items-center justify-center ${
                        isMuted
                          ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50"
                          : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700/50"
                      }`}
                    >
                      M
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary Info */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs">
          <div className="text-zinc-400">
            Active Output:{" "}
            <span className="font-semibold text-cyan-300">
              {activeTracksCount} of {tracks.length}
            </span>{" "}
            tracks active •{" "}
            <span className="font-semibold text-cyan-300">
              {activeNotesCount} / {totalCalculatedNotes}
            </span>{" "}
            notes rendered
          </div>
        </div>
      </div>

      <DialogActions>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleApply}
          className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          Apply Filter 🎛️
        </Button>
      </DialogActions>
    </Dialog>
  );
}
