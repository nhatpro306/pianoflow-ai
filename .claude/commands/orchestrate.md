---
description: Sequential multi-agent workflow for complex PianoFlow tasks. Chains planner → tdd-guide → code-reviewer → security-reviewer with structured handoffs.
---

Run a sequential agent workflow for complex tasks.

## Usage

`/orchestrate [workflow-type] [description]`

## Workflow Types

### feature
Full feature implementation:
```
planner → tdd-guide → code-reviewer → security-reviewer
```

### bugfix
Bug investigation and fix:
```
code-reviewer (root cause) → tdd-guide (regression test) → code-reviewer (verify fix)
```

### refactor
Safe structural cleanup:
```
architect → refactor-cleaner → code-reviewer
```

### security
Security-focused audit:
```
security-reviewer → code-reviewer → architect (if structural change needed)
```

## Handoff Format

Between each agent, produce:
```markdown
## HANDOFF: <from-agent> → <to-agent>

### Context
[What was done]

### Findings
[Key decisions or discoveries]

### Files Modified
[List of files touched]

### Open Questions
[What the next agent needs to resolve]
```

## Execution Pattern

1. Invoke first agent with the task description
2. Collect output as handoff document
3. Pass handoff to next agent
4. Aggregate into final report

## Final Report Format

```
ORCHESTRATION REPORT
====================
Workflow: <type>
Task: <description>
Agents: <chain>

SUMMARY
-------
[One paragraph]

FILES CHANGED
-------------
[List with workspace prefix]

TEST RESULTS
------------
uv run --directory apps/api pytest → [N passed]
pnpm -r typecheck → [OK/N errors]

SECURITY STATUS
---------------
[Findings from security-reviewer, if run]

RECOMMENDATION
--------------
[SHIP / NEEDS WORK / BLOCKED]
```

## Arguments

`$ARGUMENTS`:
- `feature <description>` — full feature workflow
- `bugfix <description>` — bug fix workflow
- `refactor <description>` — refactoring workflow
- `security <description>` — security review workflow
- `custom "<agents>" <description>` — custom agent chain, e.g. `custom "architect,tdd-guide" "redesign upload pipeline"`
