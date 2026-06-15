---
name: coding-standards
description: PianoFlow coding standards for Python (ruff, line-length 100) and TypeScript/React (eslint, tsc). Apply whenever writing or reviewing code.
---

# Coding Standards — PianoFlow

## Python Standards (ruff, line-length 100)

### Configuration
All Python workspaces use ruff with `line-length = 100`. Never use bare `python` — always `uv run --directory <workspace>`.

```toml
# pyproject.toml (each workspace)
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B"]
```

### Naming
```python
# Functions: snake_case, verb-noun
async def fetch_project(project_id: UUID) -> Project: ...
def calculate_pitch_class(midi_note: int) -> int: ...

# Classes: PascalCase
class MidiAdapter(MidiPort): ...
class ProjectService: ...

# Constants: UPPER_SNAKE
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
SQS_VISIBILITY_TIMEOUT = 300
```

### Type Hints (required on all public functions)
```python
from uuid import UUID
from typing import Optional

async def get_project(project_id: UUID, user_id: str) -> Optional[Project]:
    ...
```

### Error Handling
```python
# GOOD: specific exception, log context, re-raise or return structured error
try:
    result = await s3_port.put_object(key=s3_key, data=audio_bytes)
except S3UploadError as exc:
    logger.error("S3 upload failed", extra={"s3_key": s3_key, "error": str(exc)})
    raise StorageError(f"Upload failed for key {s3_key}") from exc

# BAD: swallowing exceptions
try:
    ...
except Exception:
    pass
```

### Pydantic v2 Patterns
```python
from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str = Field(..., max_length=200)

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    aws_region: str = "us-east-1"
    class model_config(ConfigDict):
        env_file = ".env"
```

### SQLAlchemy 2.0 Patterns
```python
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase
from sqlalchemy import String, ForeignKey
from uuid import UUID

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
```

### Immutability (Python)
```python
# GOOD: new dict/list, never mutate in-place
updated = {**original, "status": "processed"}
new_list = [*existing, new_item]
```

---

## TypeScript / React Standards (eslint + tsc)

### Naming
```typescript
// Components: PascalCase
export function ProjectCard({ project }: ProjectCardProps) { ... }

// Hooks: camelCase with 'use' prefix
export function useProjectQuery(projectId: string) { ... }

// Utilities: camelCase, verb-noun
export function formatDuration(seconds: number): string { ... }

// Constants: UPPER_SNAKE or camelCase depending on scope
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024
```

### Type Safety (no `any` without justification)
```typescript
interface ProjectData {
  id: string
  name: string
  status: 'pending' | 'processing' | 'done' | 'error'
  createdAt: Date
}

// Explicit return types on exported functions
export async function fetchProject(id: string): Promise<ProjectData> { ... }
```

### TanStack Query Patterns
```typescript
// Always set staleTime for non-real-time data
export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.getProject(projectId),
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  })
}

// Mutations with error handling
export function useUploadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => api.uploadFile(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onError: (err) => console.error('Upload failed:', err),
  })
}
```

### Supabase SSR Patterns
```typescript
// Server Component — use createServerClient
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  return supabase.auth.getSession()
}
```

### Immutability
```typescript
// GOOD
const updated = { ...project, status: 'done' }
const newList = [...projects, newProject]

// BAD
project.status = 'done'
projects.push(newProject)
```

### No `console.log` in Source
```typescript
// Remove before commit; use structured logging or server-side logger
```

---

## File Size Guidelines

- Python files: 200–400 lines typical; split modules > 600 lines
- TypeScript components: 150–300 lines; extract sub-components above 400
- Never put business logic in adapter or route handler files
