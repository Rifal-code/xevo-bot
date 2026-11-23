'use strict';

const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const BIN_DIR = path.join(__dirname, '..', 'bin');
const LOCAL_BIN = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

let cachedCommand = null;

/**
 * Deteksi path dan binary yt-dlp secara dinamis (Linux, Windows, Railway, VPS)
 */
function detectYtDlp() {
  if (cachedCommand) return cachedCommand;

  // 1. Cek binary standalone di folder bin/ proyek (hasil download auto-installer)
  if (fs.existsSync(LOCAL_BIN)) {
    try {
      execSync(`"${LOCAL_BIN}" --version`, { stdio: 'ignore' });
      cachedCommand = { bin: LOCAL_BIN, baseArgs: [] };
      return cachedCommand;
    } catch {}
  }

  // 2. Cek binary sistem yang ada di PATH
  const candidates = [
    { bin: 'yt-dlp', baseArgs: [] },
    { bin: 'python3', baseArgs: ['-m', 'yt_dlp'] },
    { bin: 'python', baseArgs: ['-m', 'yt_dlp'] }
  ];

  for (const c of candidates) {
    try {
      execSync(`${c.bin} --version`, { stdio: 'ignore' });
      cachedCommand = c;
      return cachedCommand;
    } catch {}
  }

  // 3. Fallback jika ada local bin
  if (fs.existsSync(LOCAL_BIN)) {
    cachedCommand = { bin: LOCAL_BIN, baseArgs: [] };
    return cachedCommand;
  }

  // Fallback default
  cachedCommand = {
    bin: process.platform === 'win32' ? 'python' : 'yt-dlp',
    baseArgs: process.platform === 'win32' ? ['-m', 'yt_dlp'] : []
  };
  return cachedCommand;
}

function makeTempPath(prefix, ext) {
  return path.join(os.tmpdir(), `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

function cleanFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

function runYtDlp(args, timeoutMs = 120000) {
  const runner = detectYtDlp();
  const fullArgs = [
    ...runner.baseArgs,
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '--extractor-args', 'youtube:player_client=android,ios',
    '--geo-bypass',
    '--no-check-certificates',
    '--no-warnings',
    '--no-update',
    ...args
  ];

  return new Promise((resolve, reject) => {
    execFile(runner.bin, fullArgs, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024
    }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr?.trim() || err.message));
      }
      resolve(stdout.trim());
    });
  });
}

module.exports = {
  detectYtDlp,
  runYtDlp,
  makeTempPath,
  cleanFile,
  MAX_AUDIO_SIZE,
  MAX_VIDEO_SIZE
};
