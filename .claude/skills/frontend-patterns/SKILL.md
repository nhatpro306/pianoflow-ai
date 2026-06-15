---
name: frontend-patterns
description: PianoFlow frontend patterns — Next.js 15 App Router, React 19, TanStack Query, Supabase SSR, Tailwind 4. Apply when building or reviewing apps/web code.
---

# Frontend Patterns — PianoFlow (apps/web)

## Stack

- **Next.js 15** — App Router, Server Components by default
- **React 19** — use server actions, no FC type needed, concurrent features
- **TanStack Query v5** — server-state caching; `staleTime` required on all queries
- **Supabase SSR** — `@supabase/ssr` for cookie-based auth in App Router
- **Tailwind 4** — CSS variables, `@theme` block, no `tailwind.config.js`
- **smplr** — audio playback library for piano/MIDI in browser

---

## Next.js 15 App Router Conventions

### Server vs Client Components

```typescript
// Default: Server Component (no 'use client')
// app/projects/[id]/page.tsx
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // params is a Promise in Next.js 15
  const project = await fetchProject(id)  // direct async call, no useEffect
  return <ProjectView project={project} />
}

// Client Component — only when interactivity or browser APIs needed
'use client'
export function ProjectPlayer({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectQuery(projectId)
  ...
}
```

### Route Structure
```
apps/web/src/app/
├── layout.tsx              # Root layout (providers, fonts)
├── page.tsx                # Landing page
├── (auth)/                 # Auth route group
│   ├── login/page.tsx
│   └── callback/route.ts   # Supabase auth callback
├── projects/
│   ├── page.tsx            # Projects list
│   └── [id]/
│       ├── page.tsx        # Project detail (Server Component)
│       └── upload/page.tsx
└── api/                    # Not used — backend is FastAPI (apps/api)
```

---

## TanStack Query v5 Patterns

```typescript
// hooks/useProject.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => apiClient.get(`/projects/${projectId}`),
    staleTime: 5 * 60 * 1000,   // 5 min — project data doesn't change often
    enabled: !!projectId,
  })
}

export function useUploadAudio(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiClient.uploadAudio(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
    onError: (err) => {
      console.error('Upload failed:', err)  // Replace with toast/error UI
    },
  })
}
```

Key rules:
- Always set `staleTime` — no `staleTime: 0` unless the data is real-time
- Use `invalidateQueries` after mutations, not manual cache updates
- `enabled: !!id` pattern for conditional queries

---

## Supabase SSR Auth

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}

// In Server Component
export default async function ProtectedPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  ...
}
```

---

## Tailwind 4 Conventions

```css
/* app/globals.css — define tokens in @theme */
@import "tailwindcss";

@theme {
  --color-brand: oklch(55% 0.2 250);
  --color-surface: oklch(98% 0 0);
  --font-sans: "Inter", sans-serif;
  --spacing-page: 1.5rem;
}
```

```typescript
// Use CSS variables, not hardcoded values
<div className="bg-[var(--color-surface)] px-[var(--spacing-page)]">
```

---

## smplr (Piano/MIDI Playback)

```typescript
'use client'
import { Soundfont } from 'smplr'

export function usePianoPlayer() {
  const audioCtx = useRef<AudioContext>()
  const player = useRef<Soundfont>()

  useEffect(() => {
    audioCtx.current = new AudioContext()
    player.current = new Soundfont(audioCtx.current, {
      instrument: 'acoustic_grand_piano',
    })
    return () => audioCtx.current?.close()
  }, [])

  const playNote = useCallback((midi: number, duration = 0.5) => {
    player.current?.start({ note: midi, velocity: 80, duration })
  }, [])

  return { playNote }
}
```

---

## Component Patterns

### Server → Client Boundary
```typescript
// Server Component fetches data
export default async function ProjectList() {
  const projects = await getProjects()
  return <ProjectListClient projects={projects} />  // pass as props
}

// Client Component handles interaction
'use client'
export function ProjectListClient({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState('all')
  ...
}
```

### Error Handling
```typescript
// error.tsx next to page.tsx
'use client'
export default function Error({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Loading UI
```typescript
// loading.tsx next to page.tsx — automatic Suspense boundary
export default function Loading() {
  return <ProjectListSkeleton />
}
```

---

## Rules

- Prefer Server Components; add `'use client'` only when needed
- No `window`, `document`, or browser APIs in Server Components
- All API calls to `apps/api` go through `apps/web/src/lib/api-client.ts`
- Never call Supabase directly from client for data that requires service-role key
- `console.log` removed before commit
