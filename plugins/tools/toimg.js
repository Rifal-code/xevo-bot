'use strict';

const { downloadMedia, webpToImage } = require('../../lib/media.js');

module.exports = {
  name: 'toimg',
  aliases: ['toimage', 'tovid'],
  category: 'tools',
  description: 'Ubah stiker WhatsApp kembali menjadi foto/gambar JPEG.',
  usage: '.toimg (reply stiker yang ingin diubah jadi gambar)',

  run: async ({ conn, m, reply }) => {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!/webp/i.test(mime)) {
      return reply('⚠️ *Reply stiker* dengan perintah `.toimg` untuk mengubahnya kembali menjadi foto!');
    }

    if ((q.msg || q).isAnimated) {
      return reply('⚠️ Saat ini `.toimg` hanya mendukung stiker statis (bukan animasi/GIF).');
    }

    await reply('⏳ Mengonversi stiker ke gambar...');

    try {
      const mediaMessage = q.msg || q;
      const stickerBuffer = await downloadMedia(mediaMessage, 'sticker');

      if (!stickerBuffer || stickerBuffer.length === 0) {
        throw new Error('Gagal mengunduh file stiker.');
      }

      const imgBuffer = await webpToImage(stickerBuffer);

      await conn.sendMessage(m.chat, {
        image: imgBuffer,
        caption: '✅ *Berhasil diubah dari stiker ke gambar.*'
      }, { quoted: m });

    } catch (err) {
      console.error('❌ Gagal toimg:', err);
      reply(`❌ Gagal mengubah stiker: ${err?.message || 'Error konversi file.'}`);
    }
  }
};
