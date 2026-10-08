import type { NoteData } from "@pianoflow/shared-types";

export type GenreCategory =
  | "Classical"
  | "Anime & Ghibli"
  | "K-Pop"
  | "Modern & Pop"
  | "Cinematic & Game"
  | "Jazz & Lo-Fi";

export type GenreFilter = GenreCategory | "All";

export type SongDifficulty = "Beginner" | "Intermediate" | "Master";

export type QualityTier = "studio_master" | "arranged";

export interface RepertoireSong {
  id: string;
  title: string;
  composer: string;
  period: string;
  genre: GenreCategory;
  difficulty: SongDifficulty;
  bpm: number;
  time_signature: string;
  key: string;
  duration_sec: number;
  description: string;
  coverGradient: string;
  noteCount: number;
  tags?: string[];
  isCanonical?: boolean;
  qualityTier?: QualityTier;
  isFullLength?: boolean;
  noteData: NoteData;
}

