#!/usr/bin/env node
/**
 * PreCompact Hook — Save a compact summary before context compaction.
 *
 * Appends a compaction event notice to .claude/session-state.md so that
 * the next session knows compaction occurred and when.
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

function main() {
  const timestamp = nowString();
  const notice = `\n---\n**[Compaction at ${timestamp}]** — Context was summarized. ` +
                 `Check docs/progress.md for checkpoint details.\n`;

  try {
    fs.appendFileSync(STATE_FILE, notice, 'utf8');
    log(`[PreCompact] Compaction event logged to .claude/session-state.md`);
  } catch (err) {
    // State file dir may not exist yet — create it
    try {
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, `# Session State\n${notice}`, 'utf8');
      log('[PreCompact] Created session-state.md');
    } catch (e) {
      log('[PreCompact] Could not write session-state.md: ' + e.message);
    }
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  process.stderr.write('[PreCompact] Error: ' + err.message + '\n');
  process.exit(0); // Never block
}
