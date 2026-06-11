"""Canonical note model — the contract between parser, preview, renderers.

Mirrors packages/shared-types/schemas/notes.schema.json (schema_version 1).
"""

from dataclasses import asdict, dataclass, field
from typing import Any

# v2: adds top-level `sustain` (CC64 pedal events) — additive, consumers
# of v1 fields are unaffected.
SCHEMA_VERSION = 2

PIANO_LOWEST_PITCH = 21  # A0
PIANO_HIGHEST_PITCH = 108  # C8
PIANO_KEY_COUNT = 88


@dataclass(frozen=True)
class Note:
    id: int
    pitch: int  # MIDI pitch 21..108 (A0..C8)
    name: str  # e.g. "C4"
    velocity: int  # 1..127
    start: float  # seconds
    end: float  # seconds
    duration: float  # seconds
    track: int
    hand: str  # "L" | "R"


@dataclass
class NoteData:
    schema_version: int
    bpm: float
    duration_sec: float
    time_signature: str
    notes: list[Note] = field(default_factory=list)
    tempo_map: list[dict] = field(default_factory=list)
    tracks: list[dict] = field(default_factory=list)
    meta: dict = field(default_factory=dict)
    sustain: list[dict] = field(default_factory=list)  # [{"time": s, "value": 0..127}]

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "bpm": self.bpm,
            "duration_sec": self.duration_sec,
            "time_signature": self.time_signature,
            "tempo_map": self.tempo_map,
            "tracks": self.tracks,
            "meta": self.meta,
            "sustain": self.sustain,
            "notes": [asdict(note) for note in self.notes],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NoteData":
        return cls(
            schema_version=data["schema_version"],
            bpm=data["bpm"],
            duration_sec=data["duration_sec"],
            time_signature=data["time_signature"],
            tempo_map=data.get("tempo_map", []),
            tracks=data.get("tracks", []),
            meta=data.get("meta", {}),
            sustain=data.get("sustain", []),
            notes=[Note(**note) for note in data["notes"]],
        )

    def summary(self) -> dict[str, Any]:
        """Small derived stats for projects.analysis_summary (DATABASE.md §3)."""
        pitches = [note.pitch for note in self.notes]
        return {
            "bpm": self.bpm,
            "duration_sec": self.duration_sec,
            "time_signature": self.time_signature,
            "track_count": len(self.tracks),
            "note_count": len(self.notes),
            "pitch_min": min(pitches) if pitches else None,
            "pitch_max": max(pitches) if pitches else None,
            "hand_split": self.meta.get("hand_split"),
        }
