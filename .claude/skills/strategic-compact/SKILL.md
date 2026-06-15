---
name: strategic-compact
description: Context minimization strategy for PianoFlow sessions. Suggests /compact at logical task boundaries rather than arbitrary mid-task points.
---

# Strategic Compact — PianoFlow

## Why Strategic Compaction?

Auto-compaction fires at arbitrary token thresholds — often mid-implementation, losing port interface context or the full picture of a hexagonal adapter chain.

Strategic compaction at logical boundaries preserves what matters:

- **After exploration, before implementation** — compact the "read 15 files" context; keep the plan
- **After a phase completes** — compact before starting the next phase
- **Before switching workspaces** — e.g., compact after finishing `apps/api` work before starting `apps/web`

## When to Compact

Good `/compact` moments in PianoFlow sessions:

1. You've read `docs/CODE_ARCHITECTURE.md`, port interfaces, adapters, and models. You now have a plan. **Compact → start implementing.**
2. You've finished implementing a FastAPI service and its tests. You're about to work on the web frontend. **Compact → switch context.**
3. You've resolved all ruff errors. Before running the full test suite. **Compact → run tests.**
4. After 50+ tool calls — the `suggest-compact.js` hook will remind you.

## What Survives Compaction

Compact summarizes the conversation. To survive compaction:
- Key decisions should be written to `docs/progress.md` via `/checkpoint create`
- Port interface signatures should be noted (they're in files — readable again)
- The plan document should be pasted into the chat or saved to a file first

## How It Works

The `.claude/scripts/hooks/suggest-compact.js` script runs on every Edit/Write tool call and counts tool invocations for the session. At 50 calls it suggests compaction; every 25 calls thereafter it reminds you.

This is a suggestion, not a block. You decide whether the current context is worth preserving.

## Best Practices

1. After planning: `/compact` before the first implementation
2. After debugging a hard error: compact to clear the noise, then verify the fix
3. Do NOT compact in the middle of a multi-file atomic change (e.g., port + adapter + service + test)
4. Use `/checkpoint create <name>` before compacting to anchor progress in `docs/progress.md`

## Configuration

Set `COMPACT_THRESHOLD` env var to change the suggestion threshold (default: 50 tool calls):

```json
// In .claude/settings.json env section if supported, or set in shell
COMPACT_THRESHOLD=40
```
