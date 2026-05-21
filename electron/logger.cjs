'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_LOG_DAYS = 7;   // keep a week of logs
const MAX_LOG_BYTES = 10 * 1024 * 1024; // rotate at 10 MB

let logDir = null;
let logFile = null;
let logStream = null;
let lineCount = 0;

function init() {
  if (logStream) return;
  logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  rotateOld();
  logFile = path.join(logDir, `craftnest-${new Date().toISOString().slice(0, 10)}.log`);
  logStream = fs.createWriteStream(logFile, { flags: 'a' });
  // Write a startup separator so sessions are easy to spot in the log
  const sep = `\n${'─'.repeat(80)}\n[${new Date().toISOString()}] APP START  pid=${process.pid}  v=${app.getVersion()}  platform=${process.platform}  node=${process.version}\n${'─'.repeat(80)}\n`;
  logStream.write(sep);
}

// Delete log files older than MAX_LOG_DAYS
function rotateOld() {
  try {
    const cutoff = Date.now() - MAX_LOG_DAYS * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(logDir)) {
      if (!f.endsWith('.log')) continue;
      const full = path.join(logDir, f);
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    }
  } catch {}
}

// Roll to a new file if the current one gets too big
function maybeRoll() {
  if (!logFile) return;
  try {
    if (fs.statSync(logFile).size > MAX_LOG_BYTES) {
      logStream?.end();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      logFile = path.join(logDir, `craftnest-${stamp}.log`);
      logStream = fs.createWriteStream(logFile, { flags: 'a' });
      lineCount = 0;
    }
  } catch {}
}

function fmt(level, msg, data) {
  const ts = new Date().toISOString();
  const extra = data !== undefined ? ' ' + JSON.stringify(data) : '';
  return `[${ts}] [${level.padEnd(5)}] ${msg}${extra}`;
}

function write(line) {
  init();
  logStream?.write(line + '\n');
  lineCount++;
  if (lineCount % 200 === 0) maybeRoll();
}

function debug(msg, data) { const line = fmt('DEBUG', msg, data); write(line); }
function info(msg, data)  { const line = fmt('INFO',  msg, data); console.log(line);  write(line); }
function warn(msg, data)  { const line = fmt('WARN',  msg, data); console.warn(line); write(line); }
function error(msg, data) { const line = fmt('ERROR', msg, data); console.error(line); write(line); }

function getLogPath()   { init(); return logFile; }
function getLogDir()    { init(); return logDir; }

// Return last n lines across today's log
function getRecentLogs(n = 400) {
  init();
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    return lines.slice(-n);
  } catch { return []; }
}

// Return all log files (newest first)
function listLogFiles() {
  init();
  try {
    return fs.readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .sort().reverse()
      .map(f => path.join(logDir, f));
  } catch { return []; }
}

module.exports = { debug, info, warn, error, getLogPath, getLogDir, getRecentLogs, listLogFiles };
