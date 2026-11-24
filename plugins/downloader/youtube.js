'use strict';

const path = require('path');
const fs = require('fs');
const yts = require('yt-search');
const {
  runYtDlp,
  makeTempPath,
  cleanFile,
  downloadYouTubeVideo,
  downloadYouTubeAudio,
  downloadMusicWithFallback,
  getYouTubeOEmbed,
  MAX_AUDIO_SIZE,
  MAX_VIDEO_SIZE
} = require('../../lib/ytdlp.js');

async function getInfo(url) {
  // 1. Coba ytdl-lite (sangat cepat & kebal blokir bot datacenter)
  try {
    const { getInfo: ytdlInfo } = require('ytdl-lite');
    const info = await ytdlInfo(url);
    if (info && info.title) {
      return {
        title: info.title,
        duration: info.seconds || 0,
        channel: info.author || 'YouTube',
        size: 0
      };
    }
  } catch { }

  // 2. Fallback ambil info dari oEmbed
  try {
    const oembed = await getYouTubeOEmbed(url);
    if (oembed && oembed.title) {
      return {
        title: oembed.title,
        duration: 0,
        channel: oembed.author || 'YouTube',
        size: 0
      };
    }
  } catch { }

  // 3. Fallback yt-dlp
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
  } catch {
    return {
      title: 'YouTube Media',
      duration: 0,
      channel: 'YouTube',
      size: 0
    };
  }
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
        if (info.duration > 900) return reply('❌ Durasi melebihi 15 menit. Gunakan video yang lebih pendek.');

        const dlResult = await downloadMusicWithFallback(url, info.title);
        filePath = dlResult.filePath;
        const finalTitle = dlResult.title && dlResult.title !== 'Audio YouTube' ? dlResult.title : info.title;
        const finalChannel = dlResult.channel && dlResult.channel !== 'YouTube' ? dlResult.channel : info.channel;
        const buffer = fs.readFileSync(filePath);

        if (buffer.length > MAX_AUDIO_SIZE) {
          return reply('❌ File terlalu besar (maks 15MB). Coba video yang lebih pendek.');
        }

        const sourceNote = dlResult.source ? ` • ${dlResult.source}` : '';

        await conn.sendMessage(m.chat, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${finalTitle.slice(0, 60)}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: `🎵 ${finalTitle.slice(0, 50)}`,
              body: `${finalChannel}${sourceNote}`,
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
        if (info.duration > 900) return reply('❌ Durasi melebihi 15 menit. Gunakan video yang lebih pendek.');

        const dlResult = await downloadYouTubeVideo(url, quality);
        filePath = dlResult.filePath;
        const finalTitle = dlResult.title && dlResult.title !== 'Video YouTube' ? dlResult.title : info.title;
        const finalChannel = dlResult.channel && dlResult.channel !== 'YouTube' ? dlResult.channel : info.channel;
        const buffer = fs.readFileSync(filePath);

        if (buffer.length > MAX_VIDEO_SIZE) {
          return reply('❌ File video terlalu besar (maks 50MB).');
        }

        const durSec = info.duration || (typeof dlResult.duration === 'number' ? dlResult.duration : 0);
        const durText = durSec ? fmtDuration(durSec) : (dlResult.duration || 'N/A');
        const caption = `🎬 *${finalTitle}*\n⏱️ Durasi: ${durText}\n📺 Channel: ${finalChannel}`;

        await conn.sendMessage(m.chat, {
          video: buffer,
          caption,
          mimetype: 'video/mp4'
        }, { quoted: m });

      } catch (err) {
        console.error('❌ ytmp4 error:', err);
        const errMsg = err.message || String(err);
        reply(`❌ Gagal mengunduh video:\n${errMsg.slice(0, 300)}`);
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
