'use strict';

const { getGame, clearGame, startGame, buildHint } = require('../../lib/game-session.js');

const CAK_LONTONG = [
  { soal: 'Matahari tenggelam di sebelah...', jawaban: 'Gawat', desc: 'Kalau matahari tenggelam beneran kan gawat.' },
  { soal: 'Sebelum memanah, biasanya kita harus...', jawaban: 'Merentangkan', desc: 'Salah, yang bener: narik busur, bukan merentangkan. Eh...' },
  { soal: 'Orang yang biasanya memotong rambut orang lain disebut...', jawaban: 'Botak', desc: 'Eh, maksudnya tukang cukur... tapi kalau dipotong terus jadi botak.' },
  { soal: 'Hewan yang paling panjang di dunia adalah...', jawaban: 'Antri', desc: 'Antrian panjang kan banyak yang ngantri.' },
  { soal: 'Benda yang kalau dibeli warnanya hitam, dipakai jadi merah, dibuang jadi abu-abu?', jawaban: 'Arang', desc: 'Arang dibakar jadi bara merah lalu jadi abu.' },
  { soal: 'Kaki seribu kalau belok kiri kakinya tinggal berapa?', jawaban: 'Tetap seribu', desc: 'Kan cuma belok, bukan copot kakinya.' },
  { soal: 'Gajah naik motor kelihatan apanya?', jawaban: 'Bohongnya', desc: 'Mana ada gajah bisa naik motor.' },
  { soal: 'Buah apa yang paling durhaka?', jawaban: 'Melon kundang', desc: 'Meleset dari Malin Kundang.' },
  { soal: 'Pintu apa yang didorong 10 orang pun nggak bakal kebuka?', jawaban: 'Pintu geser', desc: 'Harusnya digeser, bukan didorong.' },
  { soal: 'Kenapa nyamuk bunyinya nging-nging?', jawaban: 'Karena minum darah', desc: 'Kalau minum bensin bunyinya brem-brem.' }
];

const SUSUN_KATA = [
  { soal: 'A - K - U - L - P - A - S', jawaban: 'Kapsul', tipe: 'Benda / Obat' },
  { soal: 'T - A - R - K - A - M - E', jawaban: 'Keramat', tipe: 'Kata Sifat' },
  { soal: 'M - A - R - G - A - N - I', jawaban: 'Migrain', tipe: 'Kesehatan' },
  { soal: 'P - A - N - G - U - K - I - N', jawaban: 'Pengakuan', tipe: 'Kata Benda' },
  { soal: 'B - A - L - A - R - O - T - I', jawaban: 'Orbital', tipe: 'Sains' },
  { soal: 'S - I - M - A - T - K - E', jawaban: 'Kiamat', tipe: 'Kata Benda' },
  { soal: 'R - A - B - A - T - A - M', jawaban: 'Martabak', tipe: 'Makanan' },
  { soal: 'N - A - S - I - G - O - R - E', jawaban: 'Nasi Goreng', tipe: 'Makanan' },
  { soal: 'P - E - L - A - N - G - I', jawaban: 'Pelangi', tipe: 'Alam' },
  { soal: 'K - O - M - P - U - T - E - R', jawaban: 'Komputer', tipe: 'Teknologi' }
];

const SIAPAKAH_AKU = [
  { soal: 'Aku punya leher tapi tidak punya kepala, punya dua lengan tapi tidak punya tangan. Siapakah aku?', jawaban: 'Baju' },
  { soal: 'Aku selalu datang tapi tidak pernah tiba. Siapakah aku?', jawaban: 'Besok' },
  { soal: 'Semakin banyak aku mengambil, semakin banyak yang aku tinggalkan. Siapakah aku?', jawaban: 'Langkah kaki' },
  { soal: 'Aku punya kota tapi tidak ada rumah, punya gunung tapi tidak ada pohon, punya air tapi tidak ada ikan. Siapakah aku?', jawaban: 'Peta' },
  { soal: 'Aku tinggi saat masih muda dan pendek saat sudah tua. Siapakah aku?', jawaban: 'Lilin' },
  { soal: 'Aku punya jarum tapi tidak bisa menjahit. Siapakah aku?', jawaban: 'Jam' },
  { soal: 'Aku basah saat mengeringkan orang lain. Siapakah aku?', jawaban: 'Handuk' },
  { soal: 'Aku bisa keliling dunia tapi tetap diam di pojokan. Siapakah aku?', jawaban: 'Perangko' }
];

const FAMILY_100 = [
  { soal: 'Apa yang biasa dilakukan orang saat mati lampu?', jawaban: ['Nyalain lilin', 'Main hp', 'Tidur', 'Keluar rumah', 'Nyalain senter'] },
  { soal: 'Sebutkan makanan yang sering dijual di pinggir jalan malam hari!', jawaban: ['Nasi goreng', 'Martabak', 'Sate', 'Bakso', 'Pecel lele'] },
  { soal: 'Apa alasan orang sering telat bangun pagi?', jawaban: ['Begadang', 'Lupa pasang alarm', 'Hujan', 'Capek', 'Alarm mati'] },
  { soal: 'Barang apa yang paling sering ketinggalan saat keluar rumah?', jawaban: ['Dompet', 'Kunci', 'HP', 'Charger', 'Helm'] },
  { soal: 'Sebutkan alasan orang membuka WhatsApp!', jawaban: ['Balas chat', 'Lihat status', 'Kerja', 'Gabut', 'Cek grup'] }
];

const KHODAM_LIST = [
  'Macan Putih Penjaga WiFi', 'Kucing Oren Barbar', 'Naga Indosiar', 'Tuyul Crypto',
  'Kunti Salto', 'Bebek Geprek', 'Poci Tidur Siang', 'Monyet Ngoding',
  'Genderuwo Pemalu', 'Kuda Lumping Turbo', 'Cicak Dinding', 'Lele Terbang',
  'Raja Singa Ngantuk', 'Harimau Sumatera', 'Ayam Kampus', 'Biawak Siber'
];

const TRUTH_LIST = [
  'Siapa orang terakhir yang kamu kepoin di media sosial?',
  'Pernah bohong apa ke orang tua yang sampai sekarang belum ketahuan?',
  'Hal paling memalukan apa yang pernah kamu lakukan di depan umum?',
  'Kalau harus hapus 1 aplikasi dari HP selamanya, aplikasi apa yang kamu pilih?',
  'Siapa di grup ini yang paling sering kamu anggap lucu?'
];

const DARE_LIST = [
  'Kirim voice note nyanyi lagu anak-anak ke grup ini sekarang!',
  'Ganti foto profil WA jadi foto lucu selama 1 jam!',
  'Ketik "Aku sayang kalian semua" di grup tanpa konteks apa pun!',
  'Kirim stiker paling aneh yang ada di favorit WA kamu!',
  'Sebutkan 3 hal yang paling kamu suka dari orang yang nge-tag kamu terakhir!'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = [
  {
    name: 'caklontong',
    aliases: ['cl'],
    category: 'games',
    description: 'Main kuis tebak-tebakan kocak ala Cak Lontong.',
    usage: '.caklontong',

    run: async ({ m, reply }) => {
      if (getGame(m.chat)) {
        return reply('⚠️ Masih ada game yang berlangsung di chat ini! Jawab dulu atau ketik `.nyerah`.');
      }
      const item = pick(CAK_LONTONG);
      startGame(m.chat, {
        type: 'caklontong',
        answer: item.jawaban,
        desc: item.desc,
        timeoutMs: 60000
      }, async () => {
        await reply(`⏰ *WAKTU HABIS!*\nJawaban: *${item.jawaban}*\n💡 _${item.desc}_`);
      });

      return reply(`🤪 *CAK LONTONG*\n\n❓ ${item.soal}\n\n⏱️ Waktu: 60 detik\n💡 Ketik jawaban langsung di chat, \`.hint\` untuk bantuan, atau \`.nyerah\`.`);
    }
  },

  {
    name: 'susunkata',
    aliases: ['sk'],
    category: 'games',
    description: 'Susun huruf acak menjadi kata yang benar.',
    usage: '.susunkata',

    run: async ({ m, reply }) => {
      if (getGame(m.chat)) {
        return reply('⚠️ Masih ada game yang berlangsung di chat ini! Jawab dulu atau ketik `.nyerah`.');
      }
      const item = pick(SUSUN_KATA);
      startGame(m.chat, {
        type: 'susunkata',
        answer: item.jawaban,
        desc: `Kategori: ${item.tipe}`,
        timeoutMs: 60000
      }, async () => {
        await reply(`⏰ *WAKTU HABIS!*\nJawaban: *${item.jawaban}*`);
      });

      return reply(`🔤 *SUSUN KATA*\n\n🧩 Huruf: *${item.soal}*\n📌 Petunjuk: ${item.tipe}\n\n⏱️ Waktu: 60 detik\n💡 Ketik jawaban langsung di chat atau \`.hint\`.`);
    }
  },

  {
    name: 'siapakahaku',
    aliases: ['siapaaku', 'tekateki'],
    category: 'games',
    description: 'Game teka-teki tebak benda atau konsep.',
    usage: '.siapakahaku',

    run: async ({ m, reply }) => {
      if (getGame(m.chat)) {
        return reply('⚠️ Masih ada game yang berlangsung di chat ini! Jawab dulu atau ketik `.nyerah`.');
      }
      const item = pick(SIAPAKAH_AKU);
      startGame(m.chat, {
        type: 'siapakahaku',
        answer: item.jawaban,
        timeoutMs: 60000
      }, async () => {
        await reply(`⏰ *WAKTU HABIS!*\nJawaban: *${item.jawaban}*`);
      });

      return reply(`🕵️ *SIAPAKAH AKU?*\n\n❓ ${item.soal}\n\n⏱️ Waktu: 60 detik\n💡 Ketik jawaban langsung di chat atau \`.hint\`.`);
    }
  },

  {
    name: 'family100',
    aliases: ['f100'],
    category: 'games',
    description: 'Game Family 100 seru rame-rame di grup WhatsApp.',
    usage: '.family100',

    run: async ({ m, reply }) => {
      if (getGame(m.chat)) {
        return reply('⚠️ Masih ada game yang berlangsung di chat ini! Jawab dulu atau ketik `.nyerah`.');
      }
      const item = pick(FAMILY_100);
      const found = new Array(item.jawaban.length).fill(null);

      startGame(m.chat, {
        type: 'family100',
        answers: item.jawaban,
        found,
        timeoutMs: 90000
      }, async (g) => {
        const board = g.answers.map((ans, i) => `${i + 1}. ${g.found[i] ? `✅ *${ans}* (@${g.found[i]})` : `❌ *${ans}*`}`).join('\n');
        await reply(`⏰ *WAKTU FAMILY 100 HABIS!*\n\n${board}`);
      });

      const blank = item.jawaban.map((_, i) => `${i + 1}. ⬜ _..._`).join('\n');
      return reply(`🎯 *FAMILY 100*\n\n❓ *${item.soal}*\n\n${blank}\n\n⏱️ Waktu: 90 detik\n💡 Ketik jawaban langsung di chat atau \`.nyerah\`.`);
    }
  },

  {
    name: 'hint',
    aliases: ['bantuan'],
    category: 'games',
    description: 'Lihat petunjuk huruf untuk game yang sedang aktif.',
    usage: '.hint',

    run: async ({ m, reply }) => {
      const game = getGame(m.chat);
      if (!game) return reply('ℹ️ Tidak ada game yang sedang berlangsung.');
      if (game.type === 'family100') {
        const idx = game.found.findIndex(x => !x);
        if (idx === -1) return reply('Semua jawaban sudah ketemu!');
        return reply(`💡 Hint nomor ${idx + 1}: \`${buildHint(game.answers[idx])}\``);
      }
      return reply(`💡 Hint jawaban: \`${buildHint(game.answer)}\``);
    }
  },

  {
    name: 'nyerah',
    aliases: ['menyerah', 'skipgame'],
    category: 'games',
    description: 'Menyerah dan melihat jawaban game yang sedang aktif.',
    usage: '.nyerah',

    run: async ({ m, reply }) => {
      const game = getGame(m.chat);
      if (!game) return reply('ℹ️ Tidak ada game yang sedang berlangsung.');
      clearGame(m.chat);
      if (game.type === 'family100') {
        const board = game.answers.map((ans, i) => `${i + 1}. *${ans}*`).join('\n');
        return reply(`🏳️ *MENYERAH!*\nJawaban Family 100:\n\n${board}`);
      }
      const extra = game.desc ? `\n💡 _${game.desc}_` : '';
      return reply(`🏳️ *MENYERAH!*\nJawaban yang benar: *${game.answer}*${extra}`);
    }
  },

  {
    name: 'cekkhodam',
    aliases: ['khodam'],
    category: 'games',
    description: 'Cek khodam pendamping berdasarkan nama kamu (hiburan).',
    usage: '.cekkhodam <nama>',

    run: async ({ m, text, reply }) => {
      const nama = (text || '').trim() || m.pushName || 'Kamu';
      let hash = 0;
      for (let i = 0; i < nama.length; i++) hash = (hash * 31 + nama.charCodeAt(i)) >>> 0;
      const khodam = KHODAM_LIST[hash % KHODAM_LIST.length];
      return reply(`🔮 *CEK KHODAM*\n\n👤 Nama: *${nama}*\n👻 Khodam: *${khodam}*\n\n_Cuma hiburan ya bro!_`);
    }
  },

  {
    name: 'truth',
    aliases: ['dare'],
    category: 'games',
    description: 'Main Truth or Dare bareng teman di grup.',
    usage: '.truth atau .dare',

    run: async ({ command, reply }) => {
      const isTruth = command.toLowerCase() === 'truth';
      const item = pick(isTruth ? TRUTH_LIST : DARE_LIST);
      return reply(isTruth ? `💬 *TRUTH*\n\n${item}` : `🔥 *DARE*\n\n${item}`);
    }
  }
];
