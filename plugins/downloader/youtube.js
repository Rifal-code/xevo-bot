'use strict';

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const yts = require('yt-search');

const YTDLP = 'python';
const YTDLP_ARGS = ['-m', 'yt_dlp'];
const FFMPEG_PATH = 'ffmpeg';

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function makeTempPath(ext) {
  return path.join(os.tmpdir(), `ytdl_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

function runYtDlp(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const proc = execFile(YTDLP, [...YTDLP_ARGS, '--js-runtimes', 'nodejs', '--no-warnings', '--no-update', ...args], {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

async function getInfo(url) {
  const raw = await runYtDlp([
    '--print', '%(title)s|||%(duration)s|||%(channel)s|||%(filesize_approx,filesize)s',
    '--no-download', url
  ], 30000);
  const [title, duration, channel, size] = raw.split('|||');
  return {
    title: title || 'Unknown',
    duration: parseInt(duration) || 0,
    channel: channel || 'Unknown',
    size: parseInt(size) || 0
  };
}

async function downloadAudio(url) {
  const out = makeTempPath('mp3');
  await runYtDlp([
    '-x', '--audio-format', 'mp3', '--audio-quality', '128K',
    '-o', out.replace('.mp3', '.%(ext)s'),
    '--max-filesize', `${MAX_AUDIO_SIZE}`,
    url
  ]);
  const finalPath = out.replace('.mp3', '.mp3');
  if (!fs.existsSync(finalPath)) {
    const dir = path.dirname(out);
    const base = path.basename(out, '.mp3');
    const files = fs.readdirSync(dir).filter(f => f.startsWith(base));
    if (files.length > 0) return path.join(dir, files[0]);
    throw new Error('File audio tidak ditemukan setelah download.');
  }
  return finalPath;
}

async function downloadVideo(url, quality = 'best') {
  const out = makeTempPath('mp4');
  const formatStr = quality === '360' ? 'best[height<=360][ext=mp4]/best[height<=360]'
    : quality === '480' ? 'best[height<=480][ext=mp4]/best[height<=480]'
    : quality === '720' ? 'best[height<=720][ext=mp4]/best[height<=720]'
    : 'best[height<=480][ext=mp4]/best[height<=480]';
  
  await runYtDlp([
    '-f', formatStr,
    '--merge-output-format', 'mp4',
    '-o', out,
    '--max-filesize', `${MAX_VIDEO_SIZE}`,
    url
  ]);
  if (!fs.existsSync(out)) {
    const dir = path.dirname(out);
    const base = path.basename(out, '.mp4');
    const files = fs.readdirSync(dir).filter(f => f.startsWith(base));
    if (files.length > 0) return path.join(dir, files[0]);
    throw new Error('File video tidak ditemukan setelah download.');
  }
  return out;
}

function cleanFile(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

function fmtDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function extractYtUrl(text) {
  const match = text.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : null;
}

module.exports = [
  {
    name: 'ytmp3',
    aliases: ['yta', 'ytaudio'],
    category: 'downloader',
    description: 'Download audio MP3 dari link YouTube.',
    usage: '.ytmp3 <url_youtube>',

    run: async ({ conn, m, text, reply }) => {
      if (!text) return reply('⚠️ Masukkan link YouTube!\n\nContoh: `.ytmp3 https://youtu.be/xxxxx`');

      const url = extractYtUrl(text);
      if (!url) return reply('❌ Link YouTube tidak valid. Pastikan URL dari youtube.com atau youtu.be.');

      await reply('⏳ Mengunduh audio dari YouTube, mohon tunggu...');

      let filePath = null;
      try {
        const info = await getInfo(url);
        if (info.duration > 600) return reply('❌ Durasi melebihi 10 menit. Gunakan video yang lebih pendek.');

        filePath = await downloadAudio(url);
        const buffer = fs.readFileSync(filePath);

        if (buffer.length > MAX_AUDIO_SIZE) {
          return reply('❌ File terlalu besar (maks 15MB). Coba video yang lebih pendek.');
        }

        await conn.sendMessage(m.chat, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${info.title.slice(0, 60)}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: `🎵 ${info.title.slice(0, 50)}`,
              body: `${info.channel} • ${fmtDuration(info.duration)}`,
              mediaType: 1,
              sourceUrl: url
            }
          }
        }, { quoted: m });

      } catch (err) {
        console.error('❌ ytmp3 error:', err);
        reply(`❌ Gagal mengunduh audio: ${err.message}`);
      } finally {
        cleanFile(filePath);
      }
    }
  },

  {
    name: 'ytmp4',
    aliases: ['ytv', 'ytvideo'],
    category: 'downloader',
    description: 'Download video MP4 dari link YouTube.',
    usage: '.ytmp4 <url_youtube>',

    run: async ({ conn, m, text, reply }) => {
      if (!text) return reply('⚠️ Masukkan link YouTube!\n\nContoh: `.ytmp4 https://youtu.be/xxxxx`');

      const url = extractYtUrl(text);
      if (!url) return reply('❌ Link YouTube tidak valid.');

      await reply('⏳ Mengunduh video dari YouTube, mohon tunggu...');

      let filePath = null;
      try {
        const info = await getInfo(url);
        if (info.duration > 600) return reply('❌ Durasi melebihi 10 menit. Gunakan video yang lebih pendek.');

        filePath = await downloadVideo(url);
        const buffer = fs.readFileSync(filePath);

        if (buffer.length > MAX_VIDEO_SIZE) {
          return reply('❌ File terlalu besar (maks 50MB). Coba kualitas rendah atau video pendek.');
        }

        const caption = `🎬 *YOUTUBE VIDEO*\n\n` +
          `📌 *Judul:* ${info.title}\n` +
          `👤 *Channel:* ${info.channel}\n` +
          `⏱️ *Durasi:* ${fmtDuration(info.duration)}`;

        await conn.sendMessage(m.chat, {
          video: buffer,
          caption,
          mimetype: 'video/mp4'
        }, { quoted: m });

      } catch (err) {
        console.error('❌ ytmp4 error:', err);
        reply(`❌ Gagal mengunduh video: ${err.message}`);
      } finally {
        cleanFile(filePath);
      }
    }
  },

  {
    name: 'play',
    aliases: ['playmusic', 'lagu'],
    category: 'downloader',
    description: 'Cari dan download lagu dari YouTube berdasarkan judul.',
    usage: '.play <judul lagu>',

    run: async ({ conn, m, text, reply }) => {
      if (!text) return reply('⚠️ Masukkan judul lagu!\n\nContoh: `.play Neffex Grateful`');

      await reply('🔍 Mencari lagu, mohon tunggu...');

      let filePath = null;
      try {
        const result = await yts(text);
        const video = result.videos[0];
        if (!video) return reply('❌ Lagu tidak ditemukan. Coba kata kunci lain.');

        if (video.seconds > 600) return reply('❌ Durasi lagu melebihi 10 menit.');

        await reply(`🎵 Ditemukan: *${video.title}*\n⏱️ ${video.timestamp} • ${video.author.name}\n\n⏳ Mengunduh audio...`);

        const url = video.url;
        filePath = await downloadAudio(url);
        const buffer = fs.readFileSync(filePath);

        if (buffer.length > MAX_AUDIO_SIZE) {
          return reply('❌ File terlalu besar (maks 15MB).');
        }

        await conn.sendMessage(m.chat, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${video.title.slice(0, 60)}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: `🎵 ${video.title.slice(0, 50)}`,
              body: `${video.author.name} • ${video.timestamp}`,
              mediaType: 1,
              sourceUrl: url,
              thumbnailUrl: video.thumbnail
            }
          }
        }, { quoted: m });

      } catch (err) {
        console.error('❌ play error:', err);
        reply(`❌ Gagal mengunduh lagu: ${err.message}`);
      } finally {
        cleanFile(filePath);
      }
    }
  }
];
