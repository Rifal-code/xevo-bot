'use strict';

const axios = require('axios');
const { imageToWebp, addExif } = require('../../lib/media.js');

/**
 * Multi-engine Brat sticker generator
 */
async function fetchBratImage(text) {
  const encoded = encodeURIComponent(text);
  const endpoints = [
    `https://api.siputzx.my.id/api/m/brat?text=${encoded}`,
    `https://brat.caliphdev.com/api/brat?text=${encoded}`
  ];

  let lastErr = null;
  for (const url of endpoints) {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const buf = Buffer.from(res.data);
      if (buf && buf.length > 500) {
        return buf;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(lastErr?.message || 'Semua server generator brat sedang sibuk.');
}

module.exports = {
  name: 'brat',
  aliases: ['bratstiker', 'stikerbrat'],
  category: 'tools',
  description: 'Buat stiker teks gaya Brat yang lagi viral.',
  usage: '.brat <teks> atau reply pesan teks dengan .brat',

  run: async ({ conn, m, text, reply }) => {
    const input = (text || '').trim() || (m.quoted?.text || '').trim();
    if (!input) {
      return reply('⚠️ Masukkan teks untuk stiker Brat!\n\nContoh: `.brat lagi badmood nih`');
    }

    if (input.length > 120) {
      return reply('⚠️ Teks terlalu panjang (maksimal 120 karakter).');
    }

    await reply('⏳ Sedang membuat stiker brat...');

    try {
      const imgBuffer = await fetchBratImage(input);
      const webpBuffer = await imageToWebp(imgBuffer, false);
      const finalSticker = await addExif(webpBuffer, 'PECADO BRAT', 'Xevo Bot');

      await conn.sendMessage(m.chat, {
        sticker: finalSticker
      }, { quoted: m });
    } catch (err) {
      console.error('❌ brat error:', err);
      reply(`❌ Gagal membuat stiker brat: ${err.message}`);
    }
  }
};
