'use strict';

const igApi = require('@jerrycoder/instagram-api');

module.exports = {
  name: 'instagram',
  aliases: ['ig', 'igdl', 'reel', 'reels'],
  category: 'downloader',
  description: 'Download video Reels, feed post, atau foto dari Instagram.',
  usage: '.ig <url_instagram>',

  run: async ({ conn, m, text, reply }) => {
    if (!text) {
      return reply('⚠️ *Link Instagram tidak ditemukan!*\n\nContoh penggunaan:\n• `.ig https://www.instagram.com/reel/Cxxxxxx/`\n• `.ig https://www.instagram.com/p/Cxxxxxx/`');
    }

    const urlMatch = text.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv|stories)\/[^\s/?#]+/i);
    if (!urlMatch) {
      return reply('❌ Format link Instagram tidak valid. Pastikan link diawali dengan https://www.instagram.com/reel/... atau /p/...');
    }

    const targetUrl = urlMatch[0];
    await reply('⏳ Sedang memproses media Instagram, mohon tunggu sebentar...');

    let mediaItems = [];

    // Metode 1: Menggunakan @jerrycoder/instagram-api (SaveInsta Scraper)
    try {
      const res = await igApi.instagram(targetUrl);
      if (res) {
        if (Array.isArray(res)) {
          mediaItems = res.map(item => ({
            url: item.url,
            type: item.type === 'image' ? 'image' : 'video'
          }));
        } else if (res.url) {
          mediaItems = [{
            url: res.url,
            type: res.type === 'image' ? 'image' : 'video'
          }];
        }
      }
    } catch (err) {
      console.warn('⚠️ Metode 1 Instagram API gagal:', err?.message || err);
    }

    // Metode 2: Fallback Scraper jika Metode 1 kosong
    if (!mediaItems.length) {
      try {
        const fallbackUrl = `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(fallbackUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const json = await res.json().catch(() => null);
        if (json?.status && Array.isArray(json?.data)) {
          mediaItems = json.data.map(item => ({
            url: item.url,
            type: item.url.includes('.mp4') ? 'video' : 'image'
          }));
        }
      } catch (err) {
        console.warn('⚠️ Metode 2 Fallback gagal:', err?.message || err);
      }
    }

    if (!mediaItems.length) {
      return reply('❌ Gagal mengunduh media Instagram. Pastikan link Instagram publik (tidak diprivate) dan masih aktif.');
    }

    // Kirim maksimal 5 media jika konten berupa carousel
    const toSend = mediaItems.slice(0, 5);

    for (let i = 0; i < toSend.length; i++) {
      const item = toSend[i];
      const caption = i === 0
        ? `🎬 *INSTAGRAM DOWNLOADER*\n\n🔗 *Link:* ${targetUrl}\n_Media ${i + 1} dari ${mediaItems.length}_`
        : undefined;

      try {
        if (item.type === 'video') {
          await conn.sendMessage(m.chat, {
            video: { url: item.url },
            caption: caption,
            mimetype: 'video/mp4'
          }, { quoted: m });
        } else {
          await conn.sendMessage(m.chat, {
            image: { url: item.url },
            caption: caption
          }, { quoted: m });
        }
      } catch (sendErr) {
        console.error('❌ Gagal mengirim media Instagram:', sendErr);
      }
    }
  }
};
