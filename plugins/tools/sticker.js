'use strict';

const { downloadMedia, imageToWebp, addExif } = require('../../lib/media.js');

module.exports = {
  name: 'sticker',
  aliases: ['s', 'stiker', 'swm'],
  category: 'tools',
  description: 'Ubah gambar, foto, atau video singkat menjadi Stiker WhatsApp.',
  usage: '.s [packname|author] (reply gambar atau kirim foto dengan caption .s)',

  run: async ({ conn, m, args, reply }) => {
    // Cek apakah ada media gambar / video di pesan ini atau pesan yang di-reply (quoted)
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    const isImage = /image/i.test(mime);
    const isVideo = /video/i.test(mime);

    if (!isImage && !isVideo) {
      return reply('⚠️ *Kirim gambar dengan caption .s* atau *reply gambar/video singkat yang ingin dijadikan stiker!*');
    }

    if (isVideo && (q.msg || q).seconds > 11) {
      return reply('⚠️ Durasi video maksimal 10 detik untuk dijadikan stiker animasi.');
    }

    // Default metadata nama pack stiker
    let packname = 'PECADO STICKER';
    let author = 'Xevo Bot';

    if (args.length > 0) {
      const customMeta = args.join(' ').split('|');
      packname = customMeta[0]?.trim() || packname;
      author = customMeta[1]?.trim() || author;
    }

    await reply('⏳ Sedang membuat stiker...');

    try {
      const type = isVideo ? 'video' : 'image';
      const mediaMessage = q.msg || q;

      const mediaBuffer = await downloadMedia(mediaMessage, type);
      if (!mediaBuffer || mediaBuffer.length === 0) {
        throw new Error('Gagal mengunduh file gambar.');
      }

      // Konversi ke WebP
      const webpBuffer = await imageToWebp(mediaBuffer, isVideo);

      // Tambahkan metadata EXIF agar nama bot muncul saat stiker di-tap
      const finalSticker = await addExif(webpBuffer, packname, author);

      await conn.sendMessage(m.chat, {
        sticker: finalSticker
      }, { quoted: m });

    } catch (err) {
      console.error('❌ Gagal membuat stiker:', err);
      reply(`❌ Gagal mengubah ke stiker: ${err?.message || 'Format media tidak didukung.'}`);
    }
  }
};
