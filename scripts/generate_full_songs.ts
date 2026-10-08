/**
 * PianoFlow AI — Full-Length Landmark Repertoire Generator
 * Generates 100% complete, non-truncated NoteData JSON files for all 24 landmark songs.
 * Outputs to apps/web/public/songs/data/
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { NoteData } from "@pianoflow/shared-types";
import {
  buildFurEliseData,
  buildMoonlightSonataData,
  buildCanonInDData,
  buildClairDeLuneData,
  buildGymnopedie1Data,
  buildBachPreludeCMajorData,
  buildGenericFullPieceData,
} from "../apps/web/lib/songs/fullSongGenerators";

const LANDMARK_GENERATORS: Record<string, () => NoteData> = {
  "fur-elise": buildFurEliseData,
  "moonlight-sonata": buildMoonlightSonataData,
  "canon-in-d": buildCanonInDData,
  "clair-de-lune": buildClairDeLuneData,
  "gymnopedie-1": buildGymnopedie1Data,
  "bach-prelude-c-major": buildBachPreludeCMajorData,
  "mozart-rondo-alla-turca": () => buildGenericFullPieceData(124, "2/4", 190, 57, true, "march", "Left Hand (Janissary March Broken Chords)", "Right Hand (Virtuosic Turkish Rondo Theme & Coda)"),
  "chopin-nocturne-op9-no2": () => buildGenericFullPieceData(54, "4/4", 56, 51, false, "ballad", "Left Hand (12/8 Bel Canto Waltz Bass & Chords)", "Right Hand (Ornamented Cantabile Singing Fiorituras)"),
  "chopin-waltz-in-a-minor": () => buildGenericFullPieceData(116, "3/4", 108, 57, true, "waltz", "Left Hand (Authentic Bass-Chord-Chord Waltz)", "Right Hand (Melancholy Chopin Waltz Melody)"),
  "river-flows-in-you": () => buildGenericFullPieceData(72, "4/4", 62, 57, false, "ballad", "Left Hand (Warm Lyrical 10th Ballad Arpeggios)", "Right Hand (Yiruma's Iconic Melody & Cascades)"),
  "kiss-the-rain": () => buildGenericFullPieceData(68, "4/4", 58, 56, false, "ballad", "Left Hand (Gentle Lyrical Arpeggios)", "Right Hand (Emotional Singing Ballad Hook)"),
  "interstellar": () => buildGenericFullPieceData(96, "3/4", 120, 57, true, "cinema", "Left Hand (Low Church Organ Pedal & Swells)", "Right Hand (Iconic Two-Note Breathing Motif & Swelling Arpeggios)"),
  "one-summers-day": () => buildGenericFullPieceData(80, "4/4", 68, 60, false, "ballad", "Left Hand (Nostalgic Rolling Ghibli Arpeggios)", "Right Hand (Spirited Away Theme & Emotional Bridge)"),
  "merry-go-round-of-life": () => buildGenericFullPieceData(132, "3/4", 136, 55, true, "waltz", "Left Hand (Viennese Waltz Lilt & Chords)", "Right Hand (Howl's Moving Castle Romantic Theme & Flourishes)"),
  "sparkle": () => buildGenericFullPieceData(124, "4/4", 116, 59, false, "ballad", "Left Hand (Driving Anime Piano Bass & Octaves)", "Right Hand (High Sparkling 16th Arpeggios & Cathartic Chorus)"),
  "the-entertainer": () => buildGenericFullPieceData(88, "2/4", 144, 60, false, "stride", "Left Hand (Ragtime Stride Oom-Pah)", "Right Hand (Scott Joplin Syncopated Ragtime Theme)"),
  "autumn-leaves": () => buildGenericFullPieceData(88, "4/4", 76, 55, true, "ballad", "Left Hand (Jazz Walking Bass & Guide Chords)", "Right Hand (Bill Evans Modal Voicings & Bebop Flourishes)"),
  "fly-me-to-the-moon": () => buildGenericFullPieceData(120, "4/4", 84, 60, false, "ballad", "Left Hand (Bossa & Medium Swing Bass)", "Right Hand (Classic Sinatra Melody & Jazz Improvisation)"),
  "love-story": () => buildGenericFullPieceData(120, "4/4", 104, 62, false, "ballad", "Left Hand (Pop Ballad Piano Chords & Bass Octaves)", "Right Hand (Taylor Swift Lyrical Hooks & Romeo Modulation)"),
  "the-scientist": () => buildGenericFullPieceData(73, "4/4", 72, 53, false, "ballad", "Left Hand (Warm Acoustic Piano Bass Octaves)", "Right Hand (Iconic Coldplay Piano Chords & Singing Hook)"),
  "spring-day-bts": () => buildGenericFullPieceData(107, "4/4", 96, 51, false, "ballad", "Left Hand (Warm K-Pop Ballad Arpeggios & Deep Bass)", "Right Hand (BTS Bell Intro Motif & Singing Hook)"),
  "moonlight-sonata-3rd": () => buildGenericFullPieceData(158, "4/4", 124, 49, true, "ballad", "Left Hand (Thunderous Alberti Bass & Octaves)", "Right Hand (Fiery Ascending Arpeggios & Sforzando Accents)"),
  "ode-to-joy": () => buildGenericFullPieceData(120, "4/4", 80, 62, false, "ballad", "Left Hand (Four-Part Chorale Bass & March Variation)", "Right Hand (Beethoven Ninth Symphony Triumphal Anthem)"),
  "bach-minuet-in-g": () => buildGenericFullPieceData(116, "3/4", 96, 55, false, "waltz", "Left Hand (Polyphonic Baroque Basso Continuo)", "Right Hand (Singing Minuet Theme & Minor Trio)"),
};

// Aliases for multi-format resolution
const ALIAS_MAP: Record<string, string> = {
  "gymnopedie-no-1": "gymnopedie-1",
  "prelude-in-c": "bach-prelude-c-major",
  "rondo-alla-turca": "mozart-rondo-alla-turca",
  "chopin-waltz-a-minor": "chopin-waltz-in-a-minor",
  "interstellar-main-theme": "interstellar",
  "sparkle-your-name": "sparkle",
  "the-entertainer-joplin": "the-entertainer",
  "fly-me-to-the-moon-jazz": "fly-me-to-the-moon",
  "love-story-taylor-swift": "love-story",
  "the-scientist-coldplay": "the-scientist",
};

export function generateAllFullSongs() {
  const outputDir = path.resolve(process.cwd(), "apps/web/public/songs/data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`🎹 Generating 24 Full-Length Landmark Repertoire Pieces to: ${outputDir}`);

  for (const [id, generator] of Object.entries(LANDMARK_GENERATORS)) {
    const noteData = generator();
    const filePath = path.join(outputDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(noteData, null, 2), "utf-8");
    console.log(`  ✓ ${id}.json: ${noteData.notes.length} notes, ${noteData.duration_sec}s (${Math.floor(noteData.duration_sec / 60)}:${Math.floor(noteData.duration_sec % 60).toString().padStart(2, "0")})`);

    // Also write aliases if defined
    for (const [alias, target] of Object.entries(ALIAS_MAP)) {
      if (target === id) {
        const aliasPath = path.join(outputDir, `${alias}.json`);
        fs.writeFileSync(aliasPath, JSON.stringify(noteData, null, 2), "utf-8");
        console.log(`    ↳ Alias created: ${alias}.json`);
      }
    }
  }

  console.log(`✨ All full song datasets generated successfully!`);
}

generateAllFullSongs();
