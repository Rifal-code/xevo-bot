'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { downloadMedia, imageToWebp } = require('../../lib/media.js');

const envPath = path.join(__dirname, '..', '..', '.env');

function getApiKey() {
  // Cek environment variable terlebih dahulu
  if (process.env.REMOVEBG_API_KEY && process.env.REMOVEBG_API_KEY.trim() !== '') {
    return process.env.REMOVEBG_API_KEY.trim();
  }

  // Baca dinamis langsung dari file .env jika baru saja diedit tanpa restart
  try {
    if (fs.existsSync(envPath)) {
      const dotenv = require('dotenv');
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      if (envConfig.REMOVEBG_API_KEY && envConfig.REMOVEBG_API_KEY.trim() !== '') {
        process.env.REMOVEBG_API_KEY = envConfig.REMOVEBG_API_KEY.trim();
        return envConfig.REMOVEBG_API_KEY.trim();
      }
    }
  } catch (e) {
    console.error('⚠️ Gagal membaca .env untuk REMOVEBG_API_KEY:', e?.message || e);
  }

  return '';
}

async function removeBgWithApi(buffer, apiKey) {
  const form = new FormData();
  form.append('image_file', buffer, { filename: 'input.png' });
  form.append('size', 'auto');

  const res = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
    headers: {
      ...form.getHeaders(),
      'X-Api-Key': apiKey
    },
    responseType: 'arraybuffer',
    timeout: 25000
  });

  return Buffer.from(res.data);
}

async function removeBgWithImgly(buffer) {
  let bgRemoval;
  try {
    bgRemoval = require('@imgly/background-removal-node');
  } catch {
    throw new Error('Engine lokal tidak tersedia (modul belum terinstall).');
  }
  const blob = new Blob([buffer]);
  const resultBlob = await bgRemoval.imglyRemoveBackground(blob);
  const arrayBuffer = await resultBlob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = {
  name: 'removebg',
  aliases: ['nobg', 'hapusbg'],
  category: 'tools',
  description: 'Menghapus latar belakang (background) foto secara otomatis.',
  usage: '.removebg (reply foto atau kirim foto dengan caption .removebg)',

  run: async ({ conn, m, reply }) => {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || '';

    if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
      return reply('⚠️ *Reply atau kirim gambar* dengan caption `.removebg` untuk menghapus backgroundnya!');
    }

    await reply('⏳ Sedang menghapus background gambar, mohon tunggu sebentar...');

    try {
      const mediaMessage = q.msg || q;
      const imgBuffer = await downloadMedia(mediaMessage, 'image');

      if (!imgBuffer || imgBuffer.length === 0) {
        throw new Error('Gagal mengunduh gambar dari WhatsApp.');
      }

      let resultPng = null;
      const apiKey = getApiKey();

      // 1. Coba via Remove.bg API jika API Key tersedia
      if (apiKey) {
        try {
          resultPng = await removeBgWithApi(imgBuffer, apiKey);
        } catch (e) {
          console.warn('⚠️ Remove.bg API error, mencoba engine fallback:', e?.response?.data ? e.response.data.toString() : e.message);
        }
      }

      // 2. Coba via engine @imgly/background-removal-node (Lokal AI)
      if (!resultPng) {
        try {
          resultPng = await removeBgWithImgly(imgBuffer);
        } catch (e) {
          console.warn('⚠️ Imgly lokal fallback gagal:', e?.message || e);
        }
      }

      if (!resultPng) {
        return reply('❌ Gagal memproses gambar. Anda dapat menambahkan API Key gratis dari remove.bg pada config.json ("removeBgApiKey": "...") untuk performa maksimal.');
      }

      // Kirim hasil sebagai foto PNG transparan
      await conn.sendMessage(m.chat, {
        image: resultPng,
        caption: '✅ *Background berhasil dihapus!*',
        mimetype: 'image/png'
      }, { quoted: m });

    } catch (err) {
      console.error('❌ Gagal removebg:', err);
      return reply(`❌ Terjadi kesalahan saat menghapus background: ${err?.message || 'Error processing image.'}`);
    }
  }
};
