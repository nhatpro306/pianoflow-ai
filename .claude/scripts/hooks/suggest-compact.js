#!/usr/bin/env node
/**
 * Strategic Compact Suggester — PianoFlow
 *
 * Runs on PreToolUse (Edit/Write) to suggest manual /compact at logical
 * intervals rather than relying on arbitrary auto-compaction.
 *
 * Tracks tool call count in OS temp dir keyed by session/process.
 * Suggests at COMPACT_THRESHOLD calls (default 50), then every 25 after.
 *
 * Cross-platform (Windows, macOS, Linux). No external dependencies.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const THRESHOLD = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);

function log(msg) {
  process.stderr.write(msg + '\n');
}

function main() {
  // Use PID of parent process (or fallback) as session key
  const sessionId = process.env.CLAUDE_SESSION_ID
    || (process.ppid ? String(process.ppid) : 'default');
  const counterFile = path.join(os.tmpdir(), `pianoflow-tool-count-${sessionId}`);

  let count = 1;
  try {
    if (fs.existsSync(counterFile)) {
      count = parseInt(fs.readFileSync(counterFile, 'utf8').trim(), 10) + 1;
    }
    fs.writeFileSync(counterFile, String(count), 'utf8');
  } catch {
    // Temp file errors are non-fatal
  }

  if (count === THRESHOLD) {
    log(`[StrategicCompact] ${THRESHOLD} tool calls reached.`);
    log('[StrategicCompact] Consider /compact if you are transitioning between phases');
    log('[StrategicCompact] (exploration→implementation, api→web, fix→verify)');
  } else if (count > THRESHOLD && count % 25 === 0) {
    log(`[StrategicCompact] ${count} tool calls — good moment for /compact if context is stale`);
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  process.stderr.write('[StrategicCompact] Error: ' + err.message + '\n');
  process.exit(0); // Never block
}
