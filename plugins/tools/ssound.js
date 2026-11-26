'use strict';

const { downloadMedia, imageToWebp, addExif } = require('../../lib/media.js');
const { extractAudioOgg, sendSoundSticker, withTimeout } = require('../../lib/sound-sticker.js');

module.exports = {
  name: 'ssound',
  aliases: ['stikersound', 'stickersound', 'sndsticker'],
  category: 'tools',
  description: 'Buat stiker WhatsApp bersuara dari video atau gambar + audio.',
  usage: 'Kirim/reply video bersuara (maks 10 dtk) dengan .ssound, atau reply audio/VN lalu kirim foto/video dengan caption .ssound',

  run: async ({ conn, m, reply }) => {
    const selfMime = (m.msg || m).mimetype || '';
    const quotedMime = m.quoted ? ((m.quoted.msg || m.quoted).mimetype || '') : '';

    const selfIsImage = /image/i.test(selfMime);
    const selfIsVideo = /video/i.test(selfMime);
    const quotedIsVideo = /video/i.test(quotedMime);
    const quotedIsImage = /image/i.test(quotedMime);
    const quotedIsSticker = /webp/i.test(quotedMime);
    const quotedIsAudio = /audio/i.test(quotedMime);

    let visualType = null; // 'image' | 'video'
    let visualMsg = null;
    let audioType = null; // 'video' | 'audio'
    let audioMsg = null;
    let durationSec = 0;

    if ((selfIsImage || selfIsVideo) && quotedIsAudio) {
      // Kirim gambar atau video (tanpa suara) dengan caption .ssound sambil reply audio/VN
      visualType = selfIsVideo ? 'video' : 'image';
      visualMsg = m.msg || m;
      audioType = 'audio';
      audioMsg = m.quoted.msg || m.quoted;
      if (selfIsVideo) durationSec = Number(visualMsg.seconds || 0);
    } else if (selfIsVideo) {
      // Kirim video bersuara dengan caption .ssound
      visualType = 'video';
      visualMsg = m.msg || m;
      audioType = 'video';
      audioMsg = visualMsg;
      durationSec = Number(visualMsg.seconds || 0);
    } else if (quotedIsVideo) {
      // Reply video bersuara dengan .ssound
      visualType = 'video';
      visualMsg = m.quoted.msg || m.quoted;
      audioType = 'video';
      audioMsg = visualMsg;
      durationSec = Number(visualMsg.seconds || 0);
    } else if ((quotedIsImage || quotedIsSticker) && selfIsImage) {
      return reply('⚠️ Untuk menggabungkan gambar + suara, *reply pesan audio/VN* lalu kirim foto/video dengan caption `.ssound`.');
    } else {
      return reply(
        '🔊 *Stiker Bersuara (.ssound)*\n\n' +
        '*Cara Pakai:*\n' +
        '1️⃣ Kirim atau reply *video bersuara* (maks 10 detik) dengan `.ssound`\n' +
        '2️⃣ Atau *reply audio/VN* lalu kirim foto/video dengan caption `.ssound`\n\n' +
        '_Catatan: Audio otomatis dipotong maksimal 10 detik._'
      );
    }

    if (durationSec > 11) {
      return reply('⚠️ Durasi video maksimal 10 detik untuk dijadikan stiker.');
    }

    await reply('⏳ Memproses stiker bersuara...');

    try {
      console.log(`🔊 [ssound] Download visual (${visualType})...`);
      const visualBuf = await withTimeout(
        downloadMedia(visualMsg, visualType),
        30000,
        'mengunduh media visual'
      );
      if (!visualBuf || visualBuf.length === 0) {
        throw new Error('Gagal mengunduh media visual.');
      }

      console.log(`🔊 [ssound] Download audio (${audioType})...`);
      const audioSrcBuf = audioMsg === visualMsg
        ? visualBuf
        : await withTimeout(
            downloadMedia(audioMsg, audioType),
            30000,
            'mengunduh media audio'
          );

      if (!audioSrcBuf || audioSrcBuf.length === 0) {
        throw new Error('Gagal mengunduh media audio.');
      }

      console.log(`🔊 [ssound] Konversi WebP + OGG Opus (visual=${visualBuf.length}B, audio=${audioSrcBuf.length}B)...`);
      const [rawWebp, oggBuf] = await withTimeout(
        Promise.all([
          imageToWebp(visualBuf, visualType === 'video'),
          extractAudioOgg(audioSrcBuf, audioType === 'video' ? 'mp4' : 'ogg')
        ]),
        45000,
        'mengonversi media ke WebP & OGG Opus'
      );

      const finalWebp = await addExif(rawWebp, 'PECADO SOUND', 'PECADO BOT');
      await sendSoundSticker(conn, m.chat, finalWebp, oggBuf, { quoted: m });
    } catch (err) {
      console.error('❌ ssound error:', err);
      await reply(`❌ Gagal membuat stiker bersuara: ${err.message}`);
    }
  }
};
