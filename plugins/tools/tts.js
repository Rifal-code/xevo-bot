'use strict';

const { textToSpeech } = require('../../lib/media.js');

module.exports = {
  name: 'tts',
  aliases: ['vn', 'say', 'suara'],
  category: 'tools',
  description: 'Ubah teks menjadi pesan suara (voice note) audio Google.',
  usage: '.tts [kode_bahasa] <teks> (contoh: .tts Halo semuanya atau .tts en Good morning)',

  run: async ({ conn, m, args, text, reply }) => {
    if (!text) {
      return reply('⚠️ *Teks tidak boleh kosong!*\n\nContoh penggunaan:\n• `.tts Halo selamat pagi` (Bahasa Indonesia)\n• `.tts en Welcome to Xevo` (Bahasa Inggris)\n• `.tts ja Konnichiwa` (Bahasa Jepang)');
    }

    // Cek apakah argumen pertama adalah kode bahasa 2 huruf (id, en, ja, ar, ko, dll)
    let lang = 'id';
    let content = text;

    if (args.length > 1 && args[0].length === 2 && /^[a-z]{2}$/i.test(args[0])) {
      lang = args[0].toLowerCase();
      content = args.slice(1).join(' ');
    }

    if (content.length > 250) {
      return reply('⚠️ Panjang teks maksimal 250 karakter.');
    }

    try {
      const audioBuffer = await textToSpeech(content, lang);

      await conn.sendMessage(m.chat, {
        audio: audioBuffer,
        mimetype: 'audio/mp4',
        ptt: true // Dikirim sebagai Voice Note WhatsApp (gelombang suara hijau)
      }, { quoted: m });

    } catch (err) {
      console.error('❌ TTS Error:', err);
      reply(`❌ Gagal mengubah teks ke audio: ${err?.message || 'Server Google TTS sibuk.'}`);
    }
  }
};
