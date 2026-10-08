#!/usr/bin/env node
/**
 * PianoFlow AI — Offline MIDI Ingestion & NoteData Converter Tool
 * Usage:
 *   npx tsx scripts/ingest_midis.ts <path-to-midi-file> [output-json-path]
 *   npx tsx scripts/ingest_midis.ts scripts/fixtures/test.mid
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseMidiBytes } from "../apps/web/lib/midi/midiParser";

function main() {
  const args = process.argv.slice(2);
  let inputPath = args[0];

  if (!inputPath) {
    // Default fallback to fixture if available
    const fixturePath = path.resolve(process.cwd(), "scripts/fixtures/test.mid");
    if (fs.existsSync(fixturePath)) {
      inputPath = fixturePath;
      console.log(`ℹ️ No input file specified. Using default fixture: ${inputPath}`);
    } else {
      console.error("❌ Error: Missing input MIDI file path.");
      console.error("Usage: npx tsx scripts/ingest_midis.ts <file.mid> [output.json]");
      process.exit(1);
    }
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`❌ Error: File not found: ${resolvedInput}`);
    process.exit(1);
  }

  console.log(`🎹 Reading MIDI file: ${resolvedInput}`);
  const fileBuffer = fs.readFileSync(resolvedInput);

  try {
    const noteData = parseMidiBytes(fileBuffer);

    console.log("==================================================");
    console.log("✅ MIDI Parsing Successful!");
    console.log(`- Time Signature : ${noteData.time_signature}`);
    console.log(`- Initial BPM    : ${noteData.bpm}`);
    console.log(`- Total Duration : ${noteData.duration_sec.toFixed(2)}s`);
    console.log(`- Total Notes    : ${noteData.notes.length}`);
    if (noteData.tracks) {
      for (const tr of noteData.tracks) {
        console.log(`  • Track ${tr.index} [${tr.name}]: ${tr.note_count} notes`);
      }
    }
    console.log("==================================================");

    // Save JSON output
    const outputPath =
      args[1] ??
      resolvedInput.replace(/\.(mid|midi)$/i, ".notedata.json");

    fs.writeFileSync(outputPath, JSON.stringify(noteData, null, 2), "utf-8");
    console.log(`💾 NoteData saved to: ${outputPath}`);
  } catch (err: any) {
    console.error(`❌ Failed to parse MIDI: ${err.message}`);
    process.exit(1);
  }
}

main();
