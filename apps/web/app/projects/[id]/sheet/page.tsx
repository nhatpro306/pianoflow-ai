"use client";

import { useParams, useRouter } from "next/navigation";
import { useNotes, useProject } from "@/lib/hooks";
import { SheetMusicViewer } from "@/components/sheet/SheetMusicViewer";
import { Button } from "@/components/ui/Button";

export default function SheetMusicPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const projectQuery = useProject(projectId);
  const notesQuery = useNotes(projectId, true);

  if (projectQuery.isLoading || notesQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm">Rendering sheet music scores...</p>
        </div>
      </div>
    );
  }

  if (projectQuery.isError || !notesQuery.data) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-zinc-950 gap-4 text-center px-4">
        <p className="text-zinc-300">Unable to load sheet music for this project.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            Back to Editor
          </Button>
          <Button variant="primary" onClick={() => router.push(`/projects/${projectId}/practice`)}>
            Go to Practice Mode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SheetMusicViewer
      noteData={notesQuery.data}
      projectName={projectQuery.data?.name}
      onBackToPractice={() => router.push(`/projects/${projectId}/practice`)}
    />
  );
}
