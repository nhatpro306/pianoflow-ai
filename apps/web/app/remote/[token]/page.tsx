"use client";

import { use, useEffect, useState } from "react";

import { api } from "@/lib/api";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function RemotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<"checking" | "ready" | "expired">("checking");
  const [speed, setSpeed] = useState(1);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .getRemoteSession(token)
      .then(() => setStatus("ready"))
      .catch(() => setStatus("expired"));
  }, [token]);

  async function send(
    action: "play" | "pause" | "restart" | "seek_fwd" | "seek_back" | "speed",
    value?: number,
  ) {
    if (sending) return;
    setSending(true);
    try {
      await api.sendRemoteCommand(token, action, value);
      setLastAction(action === "speed" ? `${value}x` : action);
    } catch {
      setStatus("expired");
    } finally {
      setSending(false);
    }
  }

  if (status === "checking") {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p className="text-zinc-400">Connecting…</p>
      </main>
    );
  }

  if (status === "expired") {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-2xl">⏱️</p>
        <p className="font-semibold text-white">Session expired</p>
        <p className="text-sm text-zinc-400">
          Open the player on your computer and tap{" "}
          <span className="font-mono text-green-400">Remote</span> to get a new link.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center gap-8 p-6">
      <p className="text-sm text-zinc-500">Controlling PianoFlow on your computer</p>

      {/* Play / Pause */}
      <div className="flex w-full gap-3">
        <button
          onClick={() => send("play")}
          disabled={sending}
          className="flex-1 rounded-xl bg-green-600 py-5 text-lg font-bold text-white active:scale-95 disabled:opacity-60"
        >
          ▶ Play
        </button>
        <button
          onClick={() => send("pause")}
          disabled={sending}
          className="flex-1 rounded-xl bg-zinc-700 py-5 text-lg font-bold text-white active:scale-95 disabled:opacity-60"
        >
          ⏸ Pause
        </button>
      </div>

      {/* Seek */}
      <div className="flex w-full gap-3">
        <button
          onClick={() => send("seek_back")}
          disabled={sending}
          className="flex-1 rounded-xl border border-zinc-600 py-4 text-base text-white active:scale-95 disabled:opacity-60"
        >
          ← 10s
        </button>
        <button
          onClick={() => send("restart")}
          disabled={sending}
          className="flex-1 rounded-xl border border-zinc-600 py-4 text-base text-white active:scale-95 disabled:opacity-60"
        >
          ↺ Restart
        </button>
        <button
          onClick={() => send("seek_fwd")}
          disabled={sending}
          className="flex-1 rounded-xl border border-zinc-600 py-4 text-base text-white active:scale-95 disabled:opacity-60"
        >
          10s →
        </button>
      </div>

      {/* Speed */}
      <div className="w-full">
        <p className="mb-3 text-center text-sm text-zinc-400">Speed</p>
        <div className="grid grid-cols-3 gap-2">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => { setSpeed(s); void send("speed", s); }}
              disabled={sending}
              className={`rounded-xl py-3 text-sm font-semibold active:scale-95 disabled:opacity-60 ${
                speed === s
                  ? "bg-red-600 text-white"
                  : "border border-zinc-600 text-zinc-300"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {lastAction && (
        <p className="text-xs text-zinc-500">
          Sent: <span className="font-mono text-zinc-300">{lastAction}</span>
        </p>
      )}
    </main>
  );
}
