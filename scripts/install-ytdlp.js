'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const isWindows = process.platform === 'win32';
const BIN_DIR = path.join(__dirname, '..', 'bin');
const BIN_NAME = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', reject);
  });
}

async function ensureYtDlp() {
  if (fs.existsSync(BIN_PATH)) {
    console.log(`✅ yt-dlp binary found at: ${BIN_PATH}`);
    return BIN_PATH;
  }

  // Jika di Windows dan Python yt-dlp sudah ada, tidak wajib download binary
  if (isWindows) {
    try {
      const { execSync } = require('child_process');
      execSync('python -m yt_dlp --version', { stdio: 'ignore' });
      console.log('✅ Python yt-dlp already installed on Windows.');
      return null;
    } catch {}
  }

  console.log(`⬇️ Downloading standalone yt-dlp binary for ${process.platform}...`);
  fs.mkdirSync(BIN_DIR, { recursive: true });

  const downloadUrl = isWindows
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  try {
    await downloadFile(downloadUrl, BIN_PATH);
    if (!isWindows) {
      fs.chmodSync(BIN_PATH, 0o755);
    }
    console.log(`✅ yt-dlp successfully downloaded to: ${BIN_PATH}`);
    return BIN_PATH;
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to download yt-dlp automatically: ${err.message}`);
    return null;
  }
}

if (require.main === module) {
  ensureYtDlp().catch(() => {});
}

module.exports = { ensureYtDlp, BIN_PATH };
