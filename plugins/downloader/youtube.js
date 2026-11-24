'use strict';

const path = require('path');
const fs = require('fs');
const yts = require('yt-search');
const {
  runYtDlp,
  makeTempPath,
  cleanFile,
  downloadMusicWithFallback,
  getYouTubeOEmbed,
  MAX_AUDIO_SIZE,
  MAX_VIDEO_SIZE
} = require('../../lib/ytdlp.js');

async function getInfo(url) {
  try {
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
  } catch (err) {
    // Fallback ambil info dari oEmbed jika kena blokir yt-dlp
    const oembed = await getYouTubeOEmbed(url);
    if (oembed) {
      return {
        title: oembed.title,
        duration: 0,
        channel: oembed.author,
        size: 0
      };
    }
    throw err;
  }
}

async function downloadVideo(url, quality = '480') {
  const out = makeTempPath('ytdl', 'mp4');
  const height = quality === '360' ? 360 : quality === '720' ? 720 : 480;
  const formatStr = `bestvideo[height<=?${height}]+bestaudio/best[height<=?${height}]/b/bv*+ba/best`;
  
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

function fmtDuration(seconds) {
  if (!seconds) return 'N/A';
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

        const dlResult = await downloadMusicWithFallback(url, info.title);
        filePath = dlResult.filePath;
        const buffer = fs.readFileSync(filePath);

        if (buffer.length > MAX_AUDIO_SIZE) {
          return reply('❌ File terlalu besar (maks 15MB). Coba video yang lebih pendek.');
        }

        const sourceNote = dlResult.source.includes('Fallback') ? ` • ${dlResult.source}` : '';

        await conn.sendMessage(m.chat, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${info.title.slice(0, 60)}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: `🎵 ${info.title.slice(0, 50)}`,
              body: `${info.channel}${sourceNote}`,
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

    run: async ({ conn, m, args, text, reply }) => {
      if (!text) return reply('⚠️ Masukkan link YouTube!\n\nContoh: `.ytmp4 https://youtu.be/xxxxx`');

      const url = extractYtUrl(text);
      if (!url) return reply('❌ Link YouTube tidak valid.');

      const quality = args && args.find(a => ['360', '480', '720'].includes(a)) || '480';
      await reply('⏳ Mengunduh video dari YouTube, mohon tunggu...');

      let filePath = null;
      try {
        const info = await getInfo(url);
        if (info.duration > 600) return reply('❌ Durasi melebihi 10 menit. Gunakan video yang lebih pendek.');

        filePath = await downloadVideo(url, quality);
        const buffer = fs.readFileSync(filePath);

        if (buffer.length > MAX_VIDEO_SIZE) {
          return reply('❌ File video terlalu besar (maks 50MB).');
        }

        const caption = `🎬 *${info.title}*\n⏱️ Durasi: ${fmtDuration(info.duration)}\n📺 Channel: ${info.channel}`;

        await conn.sendMessage(m.chat, {
          video: buffer,
          caption,
          mimetype: 'video/mp4'
        }, { quoted: m });

      } catch (err) {
        console.error('❌ ytmp4 error:', err);
        let msg = err.message;
        if (
          msg.includes('confirm you\'re not a bot') ||
          msg.includes('Sign in to confirm') ||
          msg.includes('Requested format is not available') ||
          msg.includes('This video is not available')
        ) {
          msg = 'YouTube memblokir server cloud Railway untuk video langsung. Pasang environment variable YOUTUBE_COOKIES di Railway agar video dapat diunduh tanpa blokir bot.';
        }
        reply(`❌ Gagal mengunduh video: ${msg}`);
      } finally {
        cleanFile(filePath);
      }
    }
  },

  {
    name: 'play',
    aliases: ['playmusic', 'lagu'],
    category: 'downloader',
    description: 'Cari dan download lagu berdasarkan judul.',
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

        // Gunakan multi-engine music downloader (SoundCloud -> YouTube fallback)
        const dlResult = await downloadMusicWithFallback(text, video.title);
        filePath = dlResult.filePath;
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
              sourceUrl: video.url,
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
