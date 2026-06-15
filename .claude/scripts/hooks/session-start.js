#!/usr/bin/env node
/**
 * SessionStart Hook — Load previous session state for PianoFlow.
 *
 * Reads .claude/session-state.md if it exists and logs a summary to stderr
 * so Claude is aware of the last session's context.
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

function main() {
  if (fs.existsSync(STATE_FILE)) {
    const content = fs.readFileSync(STATE_FILE, 'utf8').trim();
    if (content) {
      log('[SessionStart] Previous session state found:');
      // Show first 20 lines only to avoid flooding context
      const lines = content.split('\n').slice(0, 20);
      lines.forEach(line => log('  ' + line));
      if (content.split('\n').length > 20) {
        log('  ... (read .claude/session-state.md for full state)');
      }
    }
  } else {
    log('[SessionStart] No previous session state. Fresh start.');
  }

  log('[SessionStart] PianoFlow monorepo — pnpm (web) + uv (Python)');
  process.exit(0);
}

try {
  main();
} catch (err) {
  process.stderr.write('[SessionStart] Error: ' + err.message + '\n');
  process.exit(0); // Never block
}
