'use strict';

const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const BIN_DIR = path.join(__dirname, '..', 'bin');
const LOCAL_BIN = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

let cachedCommand = null;
let cachedCookiesPath = null;

/**
 * Deteksi cookies.txt secara otomatis dari berbagai lokasi atau dari environment variable
 */
function getCookiesPath() {
  if (cachedCookiesPath && fs.existsSync(cachedCookiesPath)) {
    return cachedCookiesPath;
  }

  // 1. Cek environment variable YOUTUBE_COOKIES_PATH
  if (process.env.YOUTUBE_COOKIES_PATH && fs.existsSync(process.env.YOUTUBE_COOKIES_PATH)) {
    cachedCookiesPath = process.env.YOUTUBE_COOKIES_PATH;
    return cachedCookiesPath;
  }

  // 2. Cek environment variable YOUTUBE_COOKIES (teks cookie mentah atau base64)
  if (process.env.YOUTUBE_COOKIES) {
    try {
      let content = process.env.YOUTUBE_COOKIES.trim();
      if (!content.includes('\t') && content.length > 50) {
        // Coba decode jika diisi dalam format base64
        try {
          const decoded = Buffer.from(content, 'base64').toString('utf8');
          if (decoded.includes('\t') || decoded.includes('# Netscape')) {
            content = decoded;
          }
        } catch { }
      }
      const tmpCookie = path.join(os.tmpdir(), 'yt_cookies.txt');
      fs.writeFileSync(tmpCookie, content, 'utf8');
      cachedCookiesPath = tmpCookie;
      return cachedCookiesPath;
    } catch (err) {
      console.warn('⚠️ Gagal menulis cookie dari YOUTUBE_COOKIES:', err.message);
    }
  }

  // 3. Cek file cookies.txt di root proyek atau folder auth
  const possiblePaths = [
    path.join(process.cwd(), 'cookies.txt'),
    path.join(process.cwd(), 'auth', 'cookies.txt'),
    '/app/cookies.txt',
    '/app/auth/cookies.txt'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      cachedCookiesPath = p;
      return cachedCookiesPath;
    }
  }

  return null;
}

/**
 * Deteksi path dan binary yt-dlp secara dinamis (Linux, Windows, Railway, VPS)
 */
function detectYtDlp() {
  if (cachedCommand) return cachedCommand;

  // 1. Cek binary standalone di folder bin/ proyek
  if (fs.existsSync(LOCAL_BIN)) {
    try {
      execSync(`"${LOCAL_BIN}" --version`, { stdio: 'ignore' });
      cachedCommand = { bin: LOCAL_BIN, baseArgs: [] };
      return cachedCommand;
    } catch { }
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
    } catch { }
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
  } catch { }
}

function runYtDlp(args, timeoutMs = 120000) {
  const runner = detectYtDlp();
  const cookiesPath = getCookiesPath();

  const extraArgs = [];
  if (cookiesPath) {
    extraArgs.push('--cookies', cookiesPath);
  }

  const fullArgs = [
    ...runner.baseArgs,
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '--extractor-args', 'youtube:player_client=android,ios',
    '--geo-bypass',
    '--no-check-certificates',
    '--no-warnings',
    '--no-update',
    ...extraArgs,
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

/**
 * Download file audio secara handal:
 * Mencoba download target URL / query. Jika audio berformat m4a/opus/webm, dikonversi ke MP3.
 */
async function downloadAudioStream(target, timeoutMs = 90000) {
  const out = makeTempPath('ytdl_aud', 'mp3');
  await runYtDlp([
    '-x', '--audio-format', 'mp3', '--audio-quality', '128K',
    '-o', out.replace('.mp3', '.%(ext)s'),
    '--max-filesize', `${MAX_AUDIO_SIZE}`,
    target
  ], timeoutMs);

  if (fs.existsSync(out)) return out;

  // Cek jika tersimpan dengan ekstensi lain di tmp dir
  const dir = path.dirname(out);
  const base = path.basename(out, '.mp3');
  const files = fs.readdirSync(dir).filter(f => f.startsWith(base));
  if (files.length > 0) return path.join(dir, files[0]);

  throw new Error('File audio tidak ditemukan setelah pengunduhan.');
}

/**
 * Ambil metadata judul dari link YouTube via oEmbed publik (tidak terpengaruh blokir bot/datacenter)
 */
async function getYouTubeOEmbed(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await axios.get(oembedUrl, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.data?.title) {
      return {
        title: res.data.title,
        author: res.data.author_name || 'YouTube'
      };
    }
  } catch { }
  return null;
}

/**
 * Mesin Download Musik Multi-Engine:
 * 1. Jika query pencarian (.play / .spotify):
 *    - Pertama cari di SoundCloud via yt-dlp (scsearch1:query). SoundCloud 100% bebas blokir bot IP cloud!
 *    - Jika SoundCloud tidak ada, fallback ke YouTube.
 * 2. Jika URL YouTube langsung (.ytmp3):
 *    - Coba download langsung dari YouTube via yt-dlp.
 *    - Jika kena bot guard datacenter ('Sign in to confirm you're not a bot'),
 *      ambil judul via oEmbed dan download dari SoundCloud sebagai fallback otomatis!
 */
async function downloadMusicWithFallback(queryOrUrl, preferTitle = null) {
  const isDirectYt = /(?:youtube\.com|youtu\.be)/i.test(queryOrUrl);

  // KASUS 1: Query pencarian (bukan link langsung)
  if (!isDirectYt) {
    const query = queryOrUrl.trim();
    // 1. Coba SoundCloud terlebih dahulu (Sangat cepat & kebal blokir datacenter IP)
    try {
      const filePath = await downloadAudioStream(`scsearch1:${query}`, 60000);
      return { filePath, source: 'SoundCloud' };
    } catch (scErr) {
      console.warn('⚠️ SoundCloud search gagal, mencoba YouTube:', scErr.message);
    }

    // 2. Fallback ke YouTube
    const filePath = await downloadAudioStream(`ytsearch1:${query}`, 90000);
    return { filePath, source: 'YouTube' };
  }

  // KASUS 2: Link YouTube langsung
  try {
    const filePath = await downloadAudioStream(queryOrUrl, 90000);
    return { filePath, source: 'YouTube' };
  } catch (ytErr) {
    console.warn('⚠️ Gagal download audio langsung dari YouTube di server cloud:', ytErr.message);
    console.log('🔄 Mengaktifkan fallback engine pencarian audio berdasarkan metadata judul...');

    // Ambil judul lagu untuk fallback search
    let titleToSearch = preferTitle;
    if (!titleToSearch) {
      const oembed = await getYouTubeOEmbed(queryOrUrl);
      titleToSearch = oembed?.title;
    }

    if (!titleToSearch) {
      throw new Error(`YouTube memblokir server datacenter: ${ytErr.message}`);
    }

    // Bersihkan judul secara agresif (hapus emoji, simbol aneh, kurung, dan kata spam)
    let cleanQuery = titleToSearch
      .replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}]/gu, ' ')
      .replace(/\((.*?)\)/g, ' ')
      .replace(/\[(.*?)\]/g, ' ')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Buat beberapa variasi kata kunci pencarian
    const words = cleanQuery.split(' ').filter(Boolean);
    const searchQueries = [
      words.slice(0, 6).join(' '), // 6 kata pertama
      words.slice(0, 4).join(' '), // 4 kata pertama
      words.slice(0, 3).join(' '), // 3 kata pertama
      cleanQuery
    ].filter(Boolean);

    for (const q of searchQueries) {
      try {
        const filePath = await downloadAudioStream(`scsearch1:${q}`, 60000);
        return { filePath, source: 'SoundCloud Fallback', fallbackTitle: titleToSearch };
      } catch (scErr) {
        // Coba query variasi berikutnya
      }
    }

    throw new Error('YouTube memblokir streaming langsung di cloud. Tambahkan environment variable YOUTUBE_COOKIES di Railway untuk mengunduh video/audio dari link YouTube ini.');
  }
}

module.exports = {
  detectYtDlp,
  runYtDlp,
  makeTempPath,
  cleanFile,
  downloadAudioStream,
  downloadMusicWithFallback,
  getYouTubeOEmbed,
  getCookiesPath,
  MAX_AUDIO_SIZE,
  MAX_VIDEO_SIZE
};
