---
name: pianoflow-pm
description: Teaches Antigravity how to manage PianoFlow via GitHub (Bug triage, PR Reviews, CI/CD fixes).
---

# PianoFlow PM Skill

This skill teaches the agent how to act as the Project Manager and DevOps engineer for PianoFlow using the GitHub (`gh`) CLI.

## Workflows

### 1. Triaging Bugs
When asked to triage or log a bug found during testing:
- Use `gh issue create -t "[Bug]: <Title>" -b "<Description with steps to reproduce>"`
- Ensure labels are applied if needed (e.g., `gh issue create -l bug`)

### 2. PR Reviews
When asked to review a PR:
- Use `gh pr list` to find open PRs.
- Use `gh pr view <number>` to see details.
- Use `gh pr diff <number>` to read the code changes.
- Ensure there are no regressions in `packages/music-core`. If tests pass, use `gh pr review <number> --approve`.

### 3. CI/CD Approval Loop
When asked to fix a failing deploy:
- Use `gh run list` to find the failing run.
- Use `gh run view <run-id> --log-failed` to read the failure reason.
- Deduce the root cause, write the fix, commit, and push.
- Watch the next run pass!
