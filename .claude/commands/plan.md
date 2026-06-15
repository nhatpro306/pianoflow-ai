---
description: Restate requirements, assess risks, create step-by-step implementation plan. WAIT for user confirmation before touching any code.
---

Invoke the **planner** agent to create an implementation plan for this request.

The planner will:
1. Restate the requirements in concrete terms
2. Identify which PianoFlow workspaces are affected (`apps/api`, `apps/web`, `apps/worker`, `packages/music-core`)
3. Break the work into ordered phases with file-level steps
4. Surface risks and open questions
5. **WAIT for explicit confirmation before any code is written**

The plan format will reference exact file paths, ruff/pytest commands for Python verification, and pnpm commands for TypeScript verification.

Do not write any code until the user confirms with "yes", "proceed", or equivalent.
