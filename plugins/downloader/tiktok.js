'use strict';

const axios = require('axios');
const { runYtDlp, makeTempPath, cleanFile, MAX_VIDEO_SIZE, MAX_AUDIO_SIZE } = require('../../lib/ytdlp.js');
const fs = require('fs');

async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.tiktok.com/'
    }
  });
  return Buffer.from(res.data);
}

module.exports = {
  name: 'tiktok',
  aliases: ['tt', 'ttdl', 'tiktokdl', 'vt'],
  category: 'downloader',
  description: 'Download video TikTok tanpa watermark dan audio MP3.',
  usage: '.tiktok <url_tiktok> [opsi: audio/mp3]',

  run: async ({ conn, m, args, text, reply }) => {
    if (!text) {
      return reply('⚠️ *Link TikTok tidak ditemukan!*\n\nContoh penggunaan:\n• `.tiktok https://vt.tiktok.com/xxxxxx/`\n• `.tiktok https://vt.tiktok.com/xxxxxx/ mp3` (untuk audio saja)');
    }

    const urlMatch = text.match(/https?:\/\/(?:www\.|v[mt]\.|t\.)?tiktok\.com\/[^\s]+/i);
    if (!urlMatch) {
      return reply('❌ Format link TikTok tidak valid. Pastikan link diawali dengan https://vt.tiktok.com/ atau https://www.tiktok.com/@...');
    }

    const targetUrl = urlMatch[0];
    const wantAudio = args.some(a => ['audio', 'mp3', 'sound', 'musik'].includes(a.toLowerCase()));

    await reply('⏳ Sedang memproses video TikTok, mohon tunggu sebentar...');

    // --- METODE 1: TikWM API ---
    try {
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`;
      const res = await axios.get(apiUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const data = res.data;
      if (data && data.code === 0 && data.data) {
        const info = data.data;
        const title = info.title || 'Video TikTok';
        const author = info.author?.nickname || info.author?.unique_id || 'TikTok User';
        const videoUrl = info.play;
        const audioUrl = info.music;

        if (wantAudio && audioUrl) {
          const audioBuffer = await downloadBuffer(audioUrl);
          await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${author} - ${title.slice(0, 30)}.mp3`,
            contextInfo: {
              externalAdReply: {
                title: `🎵 Audio: ${title.slice(0, 50)}`,
                body: `Creator: @${author}`,
                mediaType: 1,
                sourceUrl: targetUrl
              }
            }
          }, { quoted: m });
          return;
        }

        if (videoUrl) {
          const videoBuffer = await downloadBuffer(videoUrl);
          const caption = `🎬 *TIKTOK DOWNLOADER (NO WATERMARK)*\n\n` +
            `👤 *Pembuat:* ${author}\n` +
            `📝 *Judul:* ${title}\n` +
            `⏱️ *Durasi:* ${info.duration || 0} detik\n` +
            `❤️ *Likes:* ${(info.digg_count || 0).toLocaleString()}\n\n` +
            `_💡 Tips: Ketik \`.tiktok ${targetUrl} mp3\` untuk audio saja._`;

          await conn.sendMessage(m.chat, {
            video: videoBuffer,
            caption: caption,
            mimetype: 'video/mp4'
          }, { quoted: m });
          return;
        }
      }
    } catch (tikwmErr) {
      console.warn('⚠️ TikWM gagal, mencoba fallback yt-dlp:', tikwmErr?.message || tikwmErr);
    }

    // --- METODE 2: Fallback yt-dlp ---
    let tempFile = null;
    try {
      if (wantAudio) {
        tempFile = makeTempPath('tt', 'mp3');
        await runYtDlp([
          '-x', '--audio-format', 'mp3',
          '-o', tempFile.replace('.mp3', '.%(ext)s'),
          '--max-filesize', `${MAX_AUDIO_SIZE}`,
          targetUrl
        ]);
        const finalPath = tempFile.replace('.mp3', '.mp3');
        const buffer = fs.readFileSync(fs.existsSync(finalPath) ? finalPath : tempFile);

        await conn.sendMessage(m.chat, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `TikTok Audio.mp3`
        }, { quoted: m });
        return;
      } else {
        tempFile = makeTempPath('tt', 'mp4');
        await runYtDlp([
          '-f', 'best[ext=mp4]/best',
          '-o', tempFile,
          '--max-filesize', `${MAX_VIDEO_SIZE}`,
          targetUrl
        ]);
        const buffer = fs.readFileSync(tempFile);

        await conn.sendMessage(m.chat, {
          video: buffer,
          caption: `🎬 *TIKTOK DOWNLOADER*\n\n_Berhasil diunduh via engine fallback._`,
          mimetype: 'video/mp4'
        }, { quoted: m });
        return;
      }
    } catch (fallbackErr) {
      console.error('❌ TikTok Downloader Error:', fallbackErr);
      reply(`❌ Gagal mengunduh video TikTok: ${fallbackErr?.message || 'Server TikTok sedang tidak dapat diakses.'}`);
    } finally {
      cleanFile(tempFile);
    }
  }
};
