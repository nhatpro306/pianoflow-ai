"use client";

import {
  LIMITS,
  THEME_PRESETS,
  type NoteColors,
  type RenderSettings,
} from "@pianoflow/shared-types";
import { useState } from "react";

interface Props {
  settings: RenderSettings;
  durationSec: number;
  /** Optimistic local update (preview reacts instantly) + debounced PATCH. */
  onChange: (patch: Partial<RenderSettings>) => void;
}

const COLOR_FIELDS: { key: keyof NoteColors; label: string }[] = [
  { key: "right_hand", label: "Right hand" },
  { key: "left_hand", label: "Left hand" },
  { key: "key_highlight", label: "Key highlight" },
  { key: "glow", label: "Glow" },
  { key: "hit_effect", label: "Hit effect" },
  { key: "background", label: "Background" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [text, setText] = useState(value);
  const [bad, setBad] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Derived-state sync: when the prop changes externally (preset switch),
  // adopt it. Guarded setState-during-render — the React-sanctioned pattern.
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
    setBad(false);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            setText(e.target.value);
            setBad(false);
            onChange(e.target.value);
          }}
          className="h-7 w-9 cursor-pointer rounded border border-zinc-700 bg-transparent"
          aria-label={`${label} color picker`}
        />
        <input
          id={`hex-${label}`}
          value={text}
          onChange={(e) => {
            const hex = e.target.value;
            setText(hex);
            if (HEX_RE.test(hex)) {
              setBad(false);
              onChange(hex.toLowerCase());
            } else {
              setBad(true);
            }
          }}
          maxLength={7}
          className={`w-20 rounded border bg-zinc-950 px-1.5 py-1 font-mono text-xs outline-none ${
            bad ? "border-red-700" : "border-zinc-700 focus:border-cyan-400"
          }`}
          aria-label={`${label} HEX value`}
        />
      </div>
    </div>
  );
}

export function SettingsPanel({ settings, durationSec, onChange }: Props) {
  const estimated = durationSec / settings.speed_multiplier;
  const estMin = Math.floor(estimated / 60);
  const estSec = Math.round(estimated % 60);

  const setColor = (key: keyof NoteColors, hex: string) =>
    onChange({
      colors: { ...settings.colors, [key]: hex },
      theme_preset: "custom",
    });

  return (
    <aside className="flex w-full flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 lg:w-80">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Theme</h3>
        <select
          value={settings.theme_preset}
          onChange={(e) => onChange({ theme_preset: e.target.value as RenderSettings["theme_preset"] })}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
          aria-label="Preset color theme"
        >
          {Object.keys(THEME_PRESETS).map((name) => (
            <option key={name} value={name}>
              {name.replace("_", " ")}
            </option>
          ))}
          <option value="custom">custom</option>
        </select>
        <button
          onClick={() => onChange({ theme_preset: "classic" })}
          className="self-start text-xs text-cyan-400 hover:underline"
        >
          Reset to default
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Colors</h3>
        {COLOR_FIELDS.map(({ key, label }) => (
          <ColorRow
            key={key}
            label={label}
            value={settings.colors[key]}
            onChange={(hex) => setColor(key, hex)}
          />
        ))}
        <div className="mt-1 flex items-center justify-between">
          <label className="text-xs text-zinc-400">Glow intensity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.glow_intensity}
            onChange={(e) => onChange({ glow_intensity: Number(e.target.value) })}
            className="w-28 accent-cyan-500"
            aria-label="Glow intensity"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Piano sound</h3>
        <select
          value={settings.piano_sound}
          onChange={(e) =>
            onChange({ piano_sound: e.target.value as RenderSettings["piano_sound"] })
          }
          className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
          aria-label="Piano sound"
        >
          {LIMITS.PIANO_SOUNDS.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">Volume</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => onChange({ volume: Number(e.target.value) })}
            className="w-28 accent-cyan-500"
            aria-label="Volume"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">Reverb</label>
          <select
            value={settings.reverb}
            onChange={(e) => onChange({ reverb: e.target.value as RenderSettings["reverb"] })}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs capitalize"
            aria-label="Reverb"
          >
            {LIMITS.REVERB_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Playback speed</h3>
        <select
          value={String(settings.speed_multiplier)}
          onChange={(e) => onChange({ speed_multiplier: Number(e.target.value) })}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
          aria-label="Playback speed"
        >
          {LIMITS.SPEED_MULTIPLIERS.map((s) => (
            <option key={s} value={String(s)}>
              {s}x{s === 1 ? " (normal)" : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          Estimated video length: {estMin}:{String(estSec).padStart(2, "0")}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Video</h3>
        <div className="flex gap-2">
          {LIMITS.RESOLUTIONS.map((r) => (
            <button
              key={r}
              onClick={() => onChange({ resolution: r })}
              className={`rounded-md border px-3 py-1 text-xs ${
                settings.resolution === r
                  ? "border-cyan-400 text-cyan-300"
                  : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {r}
            </button>
          ))}
          {LIMITS.FPS_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => onChange({ fps: f })}
              className={`rounded-md border px-3 py-1 text-xs ${
                settings.fps === f
                  ? "border-cyan-400 text-cyan-300"
                  : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {f} fps
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">Note fall speed</label>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.25}
            value={settings.note_fall_speed}
            onChange={(e) => onChange({ note_fall_speed: Number(e.target.value) })}
            className="w-28 accent-cyan-500"
            aria-label="Note fall speed"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">Keyboard size</label>
          <input
            type="range"
            min={0.7}
            max={1.3}
            step={0.1}
            value={settings.keyboard_size}
            onChange={(e) => onChange({ keyboard_size: Number(e.target.value) })}
            className="w-28 accent-cyan-500"
            aria-label="Keyboard size"
          />
        </div>
        <label className="flex items-center justify-between text-xs text-zinc-400">
          Note names
          <input
            type="checkbox"
            checked={settings.show_note_names}
            onChange={(e) => onChange({ show_note_names: e.target.checked })}
            className="accent-cyan-500"
          />
        </label>
      </section>
    </aside>
  );
}
