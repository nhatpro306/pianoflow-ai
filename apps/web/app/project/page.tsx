import Link from "next/link";

import { ProjectEditor } from "@/components/ProjectEditor";

export default async function ProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-24 text-center">
        <p className="text-lg text-zinc-300">Project id is missing.</p>
        <Link href="/projects" className="text-cyan-400 hover:underline">
          Back to projects
        </Link>
      </main>
    );
  }

  return <ProjectEditor id={id} />;
}
