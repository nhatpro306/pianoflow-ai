import { MidiUploader } from "@/components/MidiUploader";

export default function UploadPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Upload a MIDI</h1>
      <MidiUploader />
    </main>
  );
}
