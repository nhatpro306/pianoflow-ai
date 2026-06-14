import { use } from "react";

import { ProjectEditor } from "@/components/ProjectEditor";

export default function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProjectEditor id={id} />;
}
