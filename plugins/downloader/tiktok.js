'use strict';

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

    try {
      // 1. Ambil data dari TikWM API
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const data = await res.json().catch(() => null);

      if (!data || data.code !== 0 || !data.data) {
        throw new Error(data?.msg || 'Gagal mengambil data video dari server TikTok.');
      }

      const info = data.data;
      const title = info.title || 'Video TikTok';
      const author = info.author?.nickname || info.author?.unique_id || 'TikTok User';
      const videoUrl = info.play;
      const audioUrl = info.music;

      // Jika user minta audio
      if (wantAudio && audioUrl) {
        await conn.sendMessage(m.chat, {
          audio: { url: audioUrl },
          mimetype: 'audio/mp4',
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

      // Kirim Video Tanpa Watermark
      const caption = `🎬 *TIKTOK DOWNLOADER (NO WATERMARK)*\n\n` +
        `👤 *Pembuat:* ${author}\n` +
        `📝 *Judul:* ${title}\n` +
        `⏱️ *Durasi:* ${info.duration || 0} detik\n` +
        `❤️ *Likes:* ${(info.digg_count || 0).toLocaleString()}\n\n` +
        `_💡 Tips: Ketik \`.tiktok ${targetUrl} mp3\` untuk mengunduh audionya saja._`;

      await conn.sendMessage(m.chat, {
        video: { url: videoUrl },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: m });

    } catch (err) {
      console.error('❌ TikTok Downloader Error:', err);
      reply(`❌ Gagal mengunduh video TikTok: ${err?.message || 'Server scraper sedang sibuk.'}`);
    }
  }
};
