/**
 * PianoFlow AI — Full-Length Landmark Repertoire Generator
 * Generates 100% complete, non-truncated NoteData JSON files for all landmark songs.
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
  buildGurengeData,
  buildBlueBirdData,
  buildHikaruNaraData,
  buildNandemonaiyaData,
  buildKatawaredokiData,
  buildUnravelData,
  buildHeIsAPirateData,
  buildMegalovaniaData,
  buildZeldasLullabyData,
  buildSuperMarioThemeData,
  buildHedwigsThemeData,
  buildGoldenHourData,
  buildSomeoneLikeYouData,
  buildShapeOfYouData,
  buildShallowData,
  buildBohemianRhapsodyData,
  buildAllOfMeData,
  buildDynamiteData,
  buildButterData,
  buildLoveScenarioData,
  buildStayWithMeData,
  buildDebussyArabesque1Data,
  buildMoonlightSonata3rdData,
  buildMozartRondoAllaTurcaData,
  buildChopinWaltzInAMinorData,
} from "../apps/web/lib/songs/fullSongGenerators";

const LANDMARK_GENERATORS: Record<string, () => NoteData> = {
  // Classical Masterpieces
  "fur-elise": buildFurEliseData,
  "moonlight-sonata": buildMoonlightSonataData,
  "moonlight-sonata-3rd": buildMoonlightSonata3rdData,
  "canon-in-d": buildCanonInDData,
  "clair-de-lune": buildClairDeLuneData,
  "gymnopedie-1": buildGymnopedie1Data,
  "bach-prelude-c-major": buildBachPreludeCMajorData,
  "mozart-rondo-alla-turca": buildMozartRondoAllaTurcaData,
  "chopin-nocturne-op9-no2": () =>
    buildGenericFullPieceData(
      54,
      "4/4",
      56,
      51,
      false,
      "ballad",
      "Left Hand (12/8 Bel Canto Waltz Bass & Chords)",
      "Right Hand (Ornamented Cantabile Singing Fiorituras)"
    ),
  "chopin-waltz-in-a-minor": buildChopinWaltzInAMinorData,
  "ode-to-joy": () =>
    buildGenericFullPieceData(
      120,
      "4/4",
      80,
      62,
      false,
      "ballad",
      "Left Hand (Four-Part Chorale Bass & March Variation)",
      "Right Hand (Beethoven Ninth Symphony Triumphal Anthem)"
    ),
  "bach-minuet-in-g": () =>
    buildGenericFullPieceData(
      116,
      "3/4",
      96,
      55,
      false,
      "waltz",
      "Left Hand (Polyphonic Baroque Basso Continuo)",
      "Right Hand (Singing Minuet Theme & Minor Trio)"
    ),
  "debussy-arabesque-1": buildDebussyArabesque1Data,

  // Anime & Ghibli
  "one-summers-day": () =>
    buildGenericFullPieceData(
      80,
      "4/4",
      68,
      60,
      false,
      "ballad",
      "Left Hand (Nostalgic Rolling Ghibli Arpeggios)",
      "Right Hand (Spirited Away Theme & Emotional Bridge)"
    ),
  "merry-go-round-of-life": () =>
    buildGenericFullPieceData(
      132,
      "3/4",
      136,
      55,
      true,
      "waltz",
      "Left Hand (Viennese Waltz Lilt & Chords)",
      "Right Hand (Howl's Moving Castle Romantic Theme & Flourishes)"
    ),
  "sparkle": () =>
    buildGenericFullPieceData(
      124,
      "4/4",
      116,
      59,
      false,
      "ballad",
      "Left Hand (Driving Anime Piano Bass & Octaves)",
      "Right Hand (High Sparkling 16th Arpeggios & Cathartic Chorus)"
    ),
  "gurenge": buildGurengeData,
  "blue-bird": buildBlueBirdData,
  "hikaru-nara": buildHikaruNaraData,
  "nandemonaiya": buildNandemonaiyaData,
  "katawaredoki": buildKatawaredokiData,
  "unravel": buildUnravelData,

  // Cinema & Games
  "interstellar": () =>
    buildGenericFullPieceData(
      96,
      "3/4",
      120,
      57,
      true,
      "cinema",
      "Left Hand (Low Church Organ Pedal & Swells)",
      "Right Hand (Iconic Two-Note Breathing Motif & Swelling Arpeggios)"
    ),
  "the-entertainer": () =>
    buildGenericFullPieceData(
      88,
      "2/4",
      144,
      60,
      false,
      "stride",
      "Left Hand (Ragtime Stride Oom-Pah)",
      "Right Hand (Scott Joplin Syncopated Ragtime Theme)"
    ),
  "he-is-a-pirate": buildHeIsAPirateData,
  "megalovania": buildMegalovaniaData,
  "zelda-lullaby": buildZeldasLullabyData,
  "super-mario-theme": buildSuperMarioThemeData,
  "hedwigs-theme": buildHedwigsThemeData,

  // Modern & Pop
  "river-flows-in-you": () =>
    buildGenericFullPieceData(
      72,
      "4/4",
      62,
      57,
      false,
      "ballad",
      "Left Hand (Warm Lyrical 10th Ballad Arpeggios)",
      "Right Hand (Yiruma's Iconic Melody & Cascades)"
    ),
  "kiss-the-rain": () =>
    buildGenericFullPieceData(
      68,
      "4/4",
      58,
      56,
      false,
      "ballad",
      "Left Hand (Gentle Lyrical Arpeggios)",
      "Right Hand (Emotional Singing Ballad Hook)"
    ),
  "love-story": () =>
    buildGenericFullPieceData(
      120,
      "4/4",
      104,
      62,
      false,
      "ballad",
      "Left Hand (Pop Ballad Piano Chords & Bass Octaves)",
      "Right Hand (Taylor Swift Lyrical Hooks & Romeo Modulation)"
    ),
  "the-scientist": () =>
    buildGenericFullPieceData(
      73,
      "4/4",
      72,
      53,
      false,
      "ballad",
      "Left Hand (Warm Acoustic Piano Bass Octaves)",
      "Right Hand (Iconic Coldplay Piano Chords & Singing Hook)"
    ),
  "golden-hour": buildGoldenHourData,
  "someone-like-you": buildSomeoneLikeYouData,
  "shape-of-you": buildShapeOfYouData,
  "shallow": buildShallowData,
  "bohemian-rhapsody": buildBohemianRhapsodyData,
  "all-of-me": buildAllOfMeData,

  // Jazz & Lo-Fi
  "autumn-leaves": () =>
    buildGenericFullPieceData(
      88,
      "4/4",
      76,
      55,
      true,
      "ballad",
      "Left Hand (Jazz Walking Bass & Guide Chords)",
      "Right Hand (Bill Evans Modal Voicings & Bebop Flourishes)"
    ),
  "fly-me-to-the-moon": () =>
    buildGenericFullPieceData(
      120,
      "4/4",
      84,
      60,
      false,
      "ballad",
      "Left Hand (Bossa & Medium Swing Bass)",
      "Right Hand (Classic Sinatra Melody & Jazz Improvisation)"
    ),

  // K-Pop
  "spring-day-bts": () =>
    buildGenericFullPieceData(
      107,
      "4/4",
      96,
      51,
      false,
      "ballad",
      "Left Hand (Warm K-Pop Ballad Arpeggios & Deep Bass)",
      "Right Hand (BTS Bell Intro Motif & Singing Hook)"
    ),
  "dynamite-bts": buildDynamiteData,
  "butter-bts": buildButterData,
  "love-scenario-ikon": buildLoveScenarioData,
  "stay-with-me-chanyeol": buildStayWithMeData,
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

  // New landmark aliases
  "blue-bird-naruto": "blue-bird",
  "tokyo-ghoul-unravel-acoustic-solo": "unravel",
  "hes-a-pirate": "he-is-a-pirate",
  "hes-a-pirate-zimmer": "he-is-a-pirate",
  "pirates-of-the-caribbean": "he-is-a-pirate",
  "megalovania-undertale": "megalovania",
  "zeldas-lullaby": "zelda-lullaby",
  "zelda-lullaby-kondo": "zelda-lullaby",
  "super-mario-bros-theme": "super-mario-theme",
  "golden-hour-jvke": "golden-hour",
  "someone-like-you-adele": "someone-like-you",
  "shallow-lady-gaga": "shallow",
  "queen-bohemian-rhapsody-operatic": "bohemian-rhapsody",
  "all-of-me-john-legend": "all-of-me",
  "all-of-me-jazz": "all-of-me",
  "love-scenario": "love-scenario-ikon",
  "stay-with-me": "stay-with-me-chanyeol",
  "premiere-arabesque": "debussy-arabesque-1",
};

export function generateAllFullSongs() {
  const outputDir = path.resolve(process.cwd(), "apps/web/public/songs/data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`🎹 Generating Full-Length Landmark Repertoire Pieces to: ${outputDir}`);

  for (const [id, generator] of Object.entries(LANDMARK_GENERATORS)) {
    const noteData = generator();
    const filePath = path.join(outputDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(noteData, null, 2), "utf-8");
    console.log(
      `  ✓ ${id}.json: ${noteData.notes.length} notes, ${noteData.duration_sec}s (${Math.floor(
        noteData.duration_sec / 60
      )}:${Math.floor(noteData.duration_sec % 60)
        .toString()
        .padStart(2, "0")})`
    );

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
