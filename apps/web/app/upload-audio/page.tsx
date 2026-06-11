import { AudioUploader } from "@/components/AudioUploader";

export default function UploadAudioPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">
        Upload Audio <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-sm text-cyan-300">Beta</span>
      </h1>
      <p className="max-w-lg text-center text-sm text-zinc-400">
        AI creates an editable draft MIDI from your uploaded audio.
      </p>
      <AudioUploader />
    </main>
  );
}
