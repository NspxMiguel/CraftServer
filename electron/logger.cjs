'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logFile = null;
let logStream = null;

function init() {
  if (logFile) return;
  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  logFile = path.join(logDir, `craftnest-${new Date().toISOString().slice(0,10)}.log`);
  logStream = fs.createWriteStream(logFile, { flags: 'a' });
}

function fmt(level, msg, data) {
  const ts = new Date().toISOString();
  const extra = data ? ' ' + JSON.stringify(data) : '';
  return `[${ts}] [${level}] ${msg}${extra}`;
}

function info(msg, data) { init(); const line = fmt('INFO', msg, data); console.log(line); logStream?.write(line + '\n'); }
function warn(msg, data) { init(); const line = fmt('WARN', msg, data); console.warn(line); logStream?.write(line + '\n'); }
function error(msg, data) { init(); const line = fmt('ERROR', msg, data); console.error(line); logStream?.write(line + '\n'); }

function getLogPath() { init(); return logFile; }
function getRecentLogs(n = 200) { init(); try { const content = fs.readFileSync(logFile, 'utf8'); const lines = content.split('\n').filter(Boolean); return lines.slice(-n); } catch { return []; } }

module.exports = { info, warn, error, getLogPath, getRecentLogs };
