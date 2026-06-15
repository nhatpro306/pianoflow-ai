#!/usr/bin/env node
/**
 * SessionEnd Hook — Persist session summary to .claude/session-state.md.
 *
 * Creates or updates session-state.md with the current date/time so the
 * next session knows when the last session ended. The content of what was
 * accomplished should be written via /checkpoint before ending a session.
 *
 * Cross-platform (Windows, macOS, Linux). No external dependencies.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const STATE_FILE = path.join(PROJECT_DIR, '.claude', 'session-state.md');

function log(msg) {
  process.stderr.write(msg + '\n');
}

function nowString() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateString() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function main() {
  const timestamp = nowString();
  const today = dateString();

  const stateDir = path.dirname(STATE_FILE);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  if (fs.existsSync(STATE_FILE)) {
    // Update the "Last session ended" line if present, otherwise append
    let content = fs.readFileSync(STATE_FILE, 'utf8');
    const marker = '**Last session ended:**';
    if (content.includes(marker)) {
      content = content.replace(
        /\*\*Last session ended:\*\*.*/,
        `**Last session ended:** ${timestamp}`
      );
    } else {
      content += `\n**Last session ended:** ${timestamp}\n`;
    }
    fs.writeFileSync(STATE_FILE, content, 'utf8');
    log(`[SessionEnd] Updated session-state.md — ended at ${timestamp}`);
  } else {
    // Create a minimal state file
    const template = `# PianoFlow Session State

**Date:** ${today}
**Last session ended:** ${timestamp}

## Notes for Next Session

- Check docs/progress.md for checkpoint history
- Run \`uv run --directory apps/api ruff check .\` and \`pnpm -r typecheck\` before coding
- Check \`git status\` for uncommitted changes

## Context

[Add notes here via /checkpoint or manually]
`;
    fs.writeFileSync(STATE_FILE, template, 'utf8');
    log(`[SessionEnd] Created session-state.md — ended at ${timestamp}`);
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  process.stderr.write('[SessionEnd] Error: ' + err.message + '\n');
  process.exit(0); // Never block
}
