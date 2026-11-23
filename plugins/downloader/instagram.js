'use strict';

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

    let mediaList = [];
    let fetchError = null;

    // Strategi 1: Fast & reliable SnapInsta / Vkr API
    try {
      const apiUrl = `https://vkrdownloader.vercel.app/server?vkr=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const json = await res.json().catch(() => null);

      if (json && json.data) {
        if (Array.isArray(json.data.downloads)) {
          mediaList = json.data.downloads.map(d => ({
            url: d.url,
            type: d.type === 'video' || (d.format_id && d.format_id.includes('video')) ? 'video' : 'image'
          }));
        } else if (json.data.url) {
          mediaList = [{ url: json.data.url, type: json.data.type || 'video' }];
        }
      }
    } catch (e) {
      fetchError = e;
    }

    // Strategi 2: Fallback API
    if (!mediaList.length) {
      try {
        const fallbackUrl = `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(fallbackUrl);
        const json = await res.json().catch(() => null);
        if (json && json.status && Array.isArray(json.data)) {
          mediaList = json.data.map(item => ({
            url: item.url,
            type: item.url.includes('.mp4') ? 'video' : 'image'
          }));
        }
      } catch (e) {
        fetchError = e;
      }
    }

    if (!mediaList.length) {
      return reply(`❌ Gagal mengunduh media Instagram. Pastikan akun tidak diprivate atau coba link lain.`);
    }

    // Batasi pengiriman maksimal 5 media jika carousel panjang
    const toSend = mediaList.slice(0, 5);

    for (let i = 0; i < toSend.length; i++) {
      const item = toSend[i];
      const caption = i === 0 ? `📸 *INSTAGRAM DOWNLOADER*\n\n🔗 *Sumber:* ${targetUrl}\n_Media ${i + 1} dari ${mediaList.length}_` : undefined;

      try {
        if (item.type === 'video' || item.url.includes('.mp4')) {
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
        console.error('Error sending IG media item:', sendErr);
      }
    }
  }
};
