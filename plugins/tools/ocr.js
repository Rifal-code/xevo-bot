'use strict';

const Tesseract = require('tesseract.js');
const axios = require('axios');
const { downloadMedia } = require('../../lib/media.js');

async function ocrSpaceFallback(buffer) {
  try {
    const base64 = buffer.toString('base64');
    const res = await axios.post('https://api.ocr.space/parse/image', 
      new URLSearchParams({
        base64Image: `data:image/jpeg;base64,${base64}`,
        language: 'eng',
        isOverlayRequired: 'false'
      }), {
        headers: {
          'apikey': process.env.OCR_SPACE_API_KEY || 'K87899142388957',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      }
    );
    const parsed = res.data?.ParsedResults?.[0]?.ParsedText;
    return parsed ? parsed.trim() : null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  name: 'ocr',
  aliases: ['scan', 'imagetotext'],
  category: 'tools',
  description: 'Pindai dan ekstrak teks dari gambar/foto (Optical Character Recognition).',
  usage: '.ocr (reply gambar atau kirim gambar dengan caption .ocr)',

  run: async ({ conn, m, reply }) => {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
      return reply('⚠️ *Reply atau kirim gambar* dengan caption `.ocr` untuk membaca teks di dalam gambar tersebut!');
    }

    await reply('🔍 Sedang memindai teks dari gambar, mohon tunggu sebentar...');

    try {
      const mediaMessage = q.msg || q;
      const imgBuffer = await downloadMedia(mediaMessage, 'image');

      if (!imgBuffer || imgBuffer.length === 0) {
        throw new Error('Gagal mengunduh gambar dari WhatsApp.');
      }

      let textResult = '';

      // Coba OCR via Tesseract.js (Lokal)
      try {
        const { data } = await Tesseract.recognize(imgBuffer, 'eng', {
          logger: () => {}
        });
        textResult = (data?.text || '').trim();
      } catch (err) {
        console.warn('⚠️ Tesseract lokal gagal, mencoba fallback online OCR:', err?.message || err);
      }

      // Jika tesseract kosong / gagal, coba OCR.space fallback
      if (!textResult || textResult.length < 2) {
        const fallbackText = await ocrSpaceFallback(imgBuffer);
        if (fallbackText) textResult = fallbackText;
      }

      if (!textResult || textResult.length < 2) {
        return reply('⚠️ Tidak ditemukan teks yang jelas pada gambar tersebut. Pastikan tulisan cukup terang, tajam, dan tidak buram.');
      }

      const responseText = [
        '📄 *HASIL SCAN TEKS (OCR)*',
        '━━━━━━━━━━━━━━━━━━━━',
        textResult,
        '━━━━━━━━━━━━━━━━━━━━',
        '💡 _Tips: Anda dapat langsung menyalin teks di atas._'
      ].join('\n');

      return reply(responseText);

    } catch (err) {
      console.error('❌ Error OCR:', err);
      return reply(`❌ Gagal membaca teks dari gambar: ${err?.message || 'Error saat memproses gambar.'}`);
    }
  }
};
