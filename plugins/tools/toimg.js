'use strict';

const webpmux = require('node-webpmux');
const { downloadMedia, webpToImage, webpToVideo } = require('../../lib/media.js');

module.exports = {
  name: 'toimg',
  aliases: ['toimage', 'tovid'],
  category: 'tools',
  description: 'Ubah stiker WhatsApp (statis maupun animasi) kembali menjadi foto atau video.',
  usage: '.toimg (reply stiker yang ingin diubah)',

  run: async ({ conn, m, reply }) => {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!/webp/i.test(mime)) {
      return reply('⚠️ *Reply stiker* dengan perintah `.toimg` untuk mengubahnya kembali menjadi foto atau video!');
    }

    await reply('⏳ Mengonversi stiker...');

    try {
      const mediaMessage = q.msg || q;
      const stickerBuffer = await downloadMedia(mediaMessage, 'sticker');

      if (!stickerBuffer || stickerBuffer.length === 0) {
        throw new Error('Gagal mengunduh file stiker dari server WhatsApp.');
      }

      // Deteksi apakah stiker bergerak (animasi) atau statis
      let isAnim = false;
      try {
        const img = new webpmux.Image();
        await img.load(stickerBuffer);
        isAnim = !!img.hasAnim;
      } catch (e) {
        isAnim = !!(q.msg || q).isAnimated;
      }

      if (isAnim) {
        // Konversi stiker animasi menjadi video MP4
        const vidBuffer = await webpToVideo(stickerBuffer);
        await conn.sendMessage(m.chat, {
          video: vidBuffer,
          caption: '✅ *Berhasil mengubah stiker animasi ke video.*',
          mimetype: 'video/mp4'
        }, { quoted: m });
      } else {
        // Konversi stiker statis menjadi gambar JPEG
        const imgBuffer = await webpToImage(stickerBuffer);
        await conn.sendMessage(m.chat, {
          image: imgBuffer,
          caption: '✅ *Berhasil mengubah stiker ke foto.*'
        }, { quoted: m });
      }

    } catch (err) {
      console.error('❌ Gagal toimg:', err);
      reply(`❌ Gagal mengubah stiker: ${err?.message || 'Error konversi file.'}`);
    }
  }
};
