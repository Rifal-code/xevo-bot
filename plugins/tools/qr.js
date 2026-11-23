'use strict';

const { generateQr } = require('../../lib/media.js');

module.exports = {
  name: 'qr',
  aliases: ['qrcode', 'bikinqr'],
  category: 'tools',
  description: 'Membuat gambar QR Code resolusi tinggi dari teks atau link URL.',
  usage: '.qr <teks_atau_link> (contoh: .qr https://google.com)',

  run: async ({ conn, m, text, reply }) => {
    if (!text) {
      return reply('⚠️ *Teks atau link tidak boleh kosong!*\n\nContoh:\n• `.qr https://wa.me/6285600803744`\n• `.qr Pembayaran Sebesar Rp 50.000`');
    }

    if (text.length > 1000) {
      return reply('⚠️ Teks terlalu panjang untuk dibuatkan QR Code (maks 1.000 karakter).');
    }

    try {
      const qrBuffer = await generateQr(text);

      await conn.sendMessage(m.chat, {
        image: qrBuffer,
        caption: `📱 *QR CODE GENERATOR*\n\n📄 *Konten:* \`${text.length > 80 ? text.slice(0, 80) + '...' : text}\`\n\n_Scan QR Code di atas menggunakan kamera ponsel atau aplikasi scanner._`
      }, { quoted: m });

    } catch (err) {
      console.error('❌ QR Generator Error:', err);
      reply(`❌ Gagal membuat QR Code: ${err?.message || 'Terjadi kesalahan sistem.'}`);
    }
  }
};
