'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { imageToWebp, addExif } = require('../../lib/media.js');

const DEFAULT_AVATAR_PATH = path.join(__dirname, '..', '..', 'public', 'pecado-avatar.jpg');

function getDefaultAvatar() {
  try {
    if (fs.existsSync(DEFAULT_AVATAR_PATH)) {
      const b64 = fs.readFileSync(DEFAULT_AVATAR_PATH).toString('base64');
      return `data:image/jpeg;base64,${b64}`;
    }
  } catch { }
  return 'https://files.catbox.moe/lvcbhk.jpg';
}

module.exports = {
  name: 'qc',
  aliases: ['quotechat', 'fakechat'],
  category: 'tools',
  description: 'Buat stiker bubble chat WhatsApp lengkap dengan nama & foto profil.',
  usage: '.qc <teks> (atau reply pesan orang lain dengan .qc)',

  run: async ({ conn, m, text, reply }) => {
    const quotedText = (m.quoted?.text || '').trim();
    const msgText = (text || '').trim() || quotedText;
    if (!msgText) {
      return reply('⚠️ Masukkan teks atau reply pesan!\n\nContoh: `.qc Halo guys`');
    }

    if (msgText.length > 200) {
      return reply('⚠️ Teks terlalu panjang (maksimal 200 karakter).');
    }

    await reply('⏳ Sedang membuat stiker Quote Chat...');

    try {
      const targetJid = m.quoted?.sender || m.sender;
      const targetName = m.quoted
        ? (m.quoted.pushName || targetJid.split('@')[0])
        : (m.pushName || targetJid.split('@')[0]);

      let avatarUrl = getDefaultAvatar();
      try {
        const pp = await conn.profilePictureUrl(targetJid, 'image');
        if (pp) avatarUrl = pp;
      } catch { }

      const payload = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#1b1e23',
        width: 512,
        height: 768,
        scale: 2,
        messages: [
          {
            entities: [],
            avatar: true,
            from: {
              id: 1,
              name: targetName,
              photo: { url: avatarUrl }
            },
            text: msgText,
            replyMessage: {}
          }
        ]
      };

      const endpoints = [
        'https://qc.botcahx.eu.org/generate',
        'https://quote.btch.bz/generate'
      ];

      let b64 = null;
      let lastErr = null;
      for (const endpoint of endpoints) {
        try {
          const res = await axios.post(endpoint, payload, {
            timeout: 20000,
            headers: { 'Content-Type': 'application/json' }
          });
          if (res.data?.result?.image) {
            b64 = res.data.result.image;
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      if (!b64) throw new Error(lastErr?.message || 'Gagal menghasilkan gambar quote chat.');

      const pngBuffer = Buffer.from(b64, 'base64');
      const webpBuffer = await imageToWebp(pngBuffer, false);
      const finalSticker = await addExif(webpBuffer, 'PECADO QC', 'PECADO BOT');

      await conn.sendMessage(m.chat, {
        sticker: finalSticker
      }, { quoted: m });
    } catch (err) {
      console.error('❌ qc error:', err);
      reply(`❌ Gagal membuat stiker QC: ${err.message}`);
    }
  }
};
