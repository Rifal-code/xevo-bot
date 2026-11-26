'use strict';

const axios = require('axios');

module.exports = [
  {
    name: 'jadwalsholat',
    aliases: ['sholat', 'jadwalshalat'],
    category: 'tools',
    description: 'Cek jadwal sholat 5 waktu & imsak akurat per kota di Indonesia.',
    usage: '.jadwalsholat <nama kota>',

    run: async ({ text, reply }) => {
      const kota = (text || '').trim() || 'Jakarta';
      try {
        const searchRes = await axios.get(`https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(kota)}`, { timeout: 10000 });
        const list = searchRes.data?.data;
        if (!Array.isArray(list) || list.length === 0) {
          return reply(`❌ Kota *${kota}* tidak ditemukan. Coba nama kota/kabupaten lain.`);
        }

        const target = list[0];
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');

        const jadwalRes = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/${target.id}/${yyyy}/${mm}/${dd}`, { timeout: 10000 });
        const j = jadwalRes.data?.data?.jadwal;
        if (!j) throw new Error('Jadwal tidak tersedia.');

        return reply(
          `🕌 *JADWAL SHOLAT*\n` +
          `📍 *Lokasi:* ${target.lokasi}\n` +
          `📅 *Tanggal:* ${j.tanggal}\n\n` +
          `• Imsak   : ${j.imsak}\n` +
          `• Subuh   : ${j.subuh}\n` +
          `• Terbit  : ${j.terbit}\n` +
          `• Dhuha   : ${j.dhuha}\n` +
          `• Dzuhur  : ${j.dzuhur}\n` +
          `• Ashar   : ${j.ashar}\n` +
          `• Maghrib : ${j.maghrib}\n` +
          `• Isya    : ${j.isya}`
        );
      } catch (err) {
        console.error('❌ jadwalsholat error:', err);
        return reply(`❌ Gagal mengambil jadwal sholat: ${err.message}`);
      }
    }
  },

  {
    name: 'gempa',
    aliases: ['infogempa', 'bmkg'],
    category: 'tools',
    description: 'Cek informasi gempa bumi terkini resmi dari BMKG.',
    usage: '.gempa',

    run: async ({ conn, m, reply }) => {
      try {
        const res = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { timeout: 10000 });
        const g = res.data?.Infogempa?.gempa;
        if (!g) throw new Error('Data BMKG tidak tersedia.');

        const caption =
          `🌋 *INFO GEMPA TERKINI (BMKG)*\n\n` +
          `📅 *Tanggal:* ${g.Tanggal}\n` +
          `🕒 *Jam:* ${g.Jam}\n` +
          `📊 *Magnitudo:* ${g.Magnitude} SR\n` +
          `🌊 *Kedalaman:* ${g.Kedalaman}\n` +
          `📍 *Wilayah:* ${g.Wilayah}\n` +
          `🧭 *Koordinat:* ${g.Coordinates}\n` +
          `⚠️ *Potensi:* ${g.Potensi}\n` +
          `📡 *Dirasakan:* ${g.Dirasakan || '-'}`;

        if (g.Shakemap) {
          const mapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}`;
          try {
            const imgRes = await axios.get(mapUrl, { responseType: 'arraybuffer', timeout: 10000 });
            return await conn.sendMessage(m.chat, {
              image: Buffer.from(imgRes.data),
              caption
            }, { quoted: m });
          } catch { }
        }
        return reply(caption);
      } catch (err) {
        console.error('❌ gempa error:', err);
        return reply(`❌ Gagal mengambil info gempa BMKG: ${err.message}`);
      }
    }
  },

  {
    name: 'short',
    aliases: ['shortlink', 'tinyurl'],
    category: 'tools',
    description: 'Perpendek URL panjang menjadi link singkat.',
    usage: '.short <url>',

    run: async ({ text, reply }) => {
      const url = (text || '').trim();
      if (!/^https?:\/\//i.test(url)) {
        return reply('⚠️ Masukkan URL yang valid (diawali http:// atau https://).\n\nContoh: `.short https://google.com`');
      }
      try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 10000 });
        const shortUrl = String(res.data || '').trim();
        if (!shortUrl.startsWith('http')) throw new Error('Gagal memperpendek link.');
        return reply(`🔗 *SHORTLINK BERHASIL*\n\n• Asli: ${url}\n• Pendek: ${shortUrl}`);
      } catch (err) {
        return reply(`❌ Gagal memperpendek URL: ${err.message}`);
      }
    }
  }
];
