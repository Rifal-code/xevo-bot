'use strict';

const path = require('path');
const fs = require('fs');
const yts = require('yt-search');
const {
  cleanFile,
  downloadMusicWithFallback,
  MAX_AUDIO_SIZE
} = require('../../lib/ytdlp.js');

async function getSpotifyMeta(spotifyUrl) {
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
  const res = await fetch(oembedUrl, { timeout: 10000 });
  if (!res.ok) throw new Error('Gagal mengambil metadata Spotify.');
  return res.json();
}

module.exports = {
  name: 'spotify',
  aliases: ['spotdl', 'spotifymp3'],
  category: 'downloader',
  description: 'Download lagu dari link Spotify.',
  usage: '.spotify <url_spotify>',

  run: async ({ conn, m, text, reply }) => {
    if (!text) {
      return reply('⚠️ Masukkan link Spotify!\n\nContoh: `.spotify https://open.spotify.com/track/xxxxx`');
    }

    const spotifyMatch = text.match(/https?:\/\/open\.spotify\.com\/(track|intl-\w+\/track)\/[\w]+/i);
    if (!spotifyMatch) {
      return reply('❌ Link Spotify tidak valid. Pastikan berupa link track dari open.spotify.com.');
    }
    const spotifyUrl = spotifyMatch[0];

    await reply('⏳ Memproses lagu Spotify, mohon tunggu...');

    let filePath = null;
    try {
      const meta = await getSpotifyMeta(spotifyUrl);
      const trackTitle = meta.title || 'Unknown Track';
      const thumbnailUrl = meta.thumbnail_url || '';

      await reply(`🎵 Ditemukan: *${trackTitle}*\n\n⏳ Mengunduh audio...`);

      // Gunakan multi-engine music downloader
      const dlResult = await downloadMusicWithFallback(trackTitle, trackTitle);
      filePath = dlResult.filePath;
      const buffer = fs.readFileSync(filePath);

      if (buffer.length > MAX_AUDIO_SIZE) {
        return reply('❌ File terlalu besar (maks 15MB).');
      }

      await conn.sendMessage(m.chat, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${trackTitle.slice(0, 60)}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: `🎵 ${trackTitle.slice(0, 50)}`,
            body: `Spotify • ${dlResult.source}`,
            mediaType: 1,
            sourceUrl: spotifyUrl,
            thumbnailUrl: thumbnailUrl
          }
        }
      }, { quoted: m });

    } catch (err) {
      console.error('❌ Spotify error:', err);
      reply(`❌ Gagal mengunduh lagu Spotify: ${err.message}`);
    } finally {
      cleanFile(filePath);
    }
  }
};
