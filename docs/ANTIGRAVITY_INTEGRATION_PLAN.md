# PianoFlow ?" Antigravity & MCP Integration Plan

**Date:** 2026-09-28
**Purpose:** Outlines how we will integrate PianoFlow with Antigravity via the Model Context Protocol (MCP) to enable autonomous testing, virtual MIDI playing, and seamless GitHub project management.

---

## 1. The Challenge

In **Phase 5**, we will implement "Practice Mode" where the browser connects to a physical MIDI keyboard via the Web MIDI API to score the user's playing in real-time.

**The testing problem:** How do you run integration tests for a UI that requires a physical piano? How does the Antigravity agent (which is an AI) test the UI loop without a physical device?

## 2. Solution: The "Virtual Pianist" MCP Server

We will build an **Antigravity MCP Plugin** that gives the AI agent the ability to "play" the PianoFlow web application as if it were a human with a MIDI keyboard.

### Architecture
We will create a Node.js Stdio MCP Server (`plugins/virtual-pianist/mcp_config.json`) with the following components:

1. **Playwright Headless Browser:**
   The MCP server launches the PianoFlow web app using Playwright.
2. **Web MIDI Mock Injection:**
   The server injects a custom mock for `navigator.requestMIDIAccess()` into the browser session. This mock registers a fake "Virtual AI Piano" device.
3. **MCP Tools:**
   The server exposes tools directly to the Antigravity agent:
   - `play_midi_note(pitch: number, velocity: number, duration_ms: number)`
   - `play_chord(pitches: number[], duration_ms: number)`
   - `get_practice_score()`

### Workflow
1. The developer asks Antigravity: *"Can you test the Web MIDI Wait Mode on the 'Fur Elise' project?"*
2. Antigravity activates the `virtual-pianist` MCP server.
3. Antigravity uses the `play_midi_note` tool to emit a Middle C (pitch 60).
4. The MCP server relays this to the Playwright browser via the mocked Web MIDI API.
5. The PianoFlow Next.js frontend registers the keypress, updates the UI (turning the falling note green), and calculates the score.
6. Antigravity calls `get_practice_score()` to assert that the logic worked perfectly.

## 3. GitHub Integrations

Since Antigravity already has full authenticated `gh` CLI access to the workspace (configured via device flow), we will formalize the agent's GitHub workflow using **Antigravity Skills**.

### The `pianoflow-pm` Skill
We will create a skill at `.agents/skills/pianoflow-pm/SKILL.md` that teaches the agent how to:
1. **Triaging Bugs:** When a bug is found in the frontend, the agent will use `gh issue create` to log it with reproducing steps.
2. **PR Reviews:** Before deploying, the agent will automatically read `gh pr view` and check for regressions in the `music-core` transcription engine.
3. **Approval Loop:** If a deploy fails, the agent will automatically read the GitHub Actions logs (`gh run view --log-failed`), deduce the root cause, and push a fix.

## 4. Implementation Steps

1. **Setup MCP Plugin Directory:**
   ```bash
   mkdir -p plugins/virtual-pianist
   npm init -y
   npm install @modelcontextprotocol/sdk playwright
   ```
2. **Write the Server:** Implement `server.ts` using `@modelcontextprotocol/sdk` to define the tools.
3. **Register `mcp_config.json`:**
   ```json
   {
     "mcpServers": {
       "pianoflow-virtual-pianist": {
         "command": "npx",
         "args": ["tsx", "plugins/virtual-pianist/server.ts"]
       }
     }
   }
   ```
4. **Agent Testing:** Ask Antigravity to run a song and verify the scoring output.
