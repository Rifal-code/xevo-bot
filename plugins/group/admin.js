'use strict';

module.exports = {
  name: 'kick',
  aliases: ['add'],
  category: 'group',
  description: 'Mengeluarkan (kick) atau menambahkan (add) anggota grup WhatsApp.',
  usage: '.kick <@mention / reply pesan> atau .add <nomor 628xxx>',

  async run({ conn, m, command, args, reply }) {
    if (!m.isGroup) {
      return reply('❌ Fitur ini hanya dapat digunakan di dalam grup WhatsApp.');
    }

    try {
      const groupMetadata = await conn.groupMetadata(m.chat);
      const participants = groupMetadata?.participants || [];

      // Cek apakah bot adalah admin
      const botNumber = (conn.user?.id || '').replace(/:\d+@/, '@').split('@')[0];
      const botParticipant = participants.find(p => p.id.split('@')[0] === botNumber);
      const isBotAdmin = !!botParticipant?.admin;

      if (!isBotAdmin) {
        return reply('❌ Bot harus menjadi *Admin Grup* terlebih dahulu agar dapat mengelola anggota.');
      }

      // Cek apakah pengirim adalah admin
      const senderNumber = (m.sender || '').split('@')[0];
      const senderParticipant = participants.find(p => p.id.split('@')[0] === senderNumber);
      const isSenderAdmin = !!senderParticipant?.admin;

      if (!isSenderAdmin) {
        return reply('❌ Perintah ini hanya dapat dijalankan oleh *Admin Grup*.');
      }

      const isKick = command.toLowerCase() === 'kick';

      if (isKick) {
        // Tentukan target kick dari: reply, mention, atau argumen
        let targetJid = null;
        if (m.quoted?.sender) {
          targetJid = m.quoted.sender;
        } else if (m.msg?.contextInfo?.mentionedJid?.[0]) {
          targetJid = m.msg.contextInfo.mentionedJid[0];
        } else if (args[0]) {
          const cleanNum = args[0].replace(/\D/g, '');
          if (cleanNum) targetJid = `${cleanNum}@s.whatsapp.net`;
        }

        if (!targetJid) {
          return reply('📌 *Cara Kick Member:*\nReply pesan member yang ingin di-kick atau ketik: `.kick @mention`');
        }

        const targetNumber = targetJid.split('@')[0];

        // Mencegah kick bot sendiri
        if (targetNumber === botNumber) {
          return reply('⚠️ Bot tidak bisa mengeluarkan dirinya sendiri.');
        }

        // Mencegah kick sesama admin grup
        const targetParticipant = participants.find(p => p.id.split('@')[0] === targetNumber);
        if (targetParticipant?.admin) {
          return reply('⚠️ Tidak dapat mengeluarkan sesama *Admin Grup*.');
        }

        await conn.groupParticipantsUpdate(m.chat, [targetJid], 'remove');
        return reply(`✅ Berhasil mengeluarkan @${targetNumber} dari grup.`, null, {
          mentions: [targetJid]
        });
      } else {
        // Perintah .add
        let rawTarget = args[0] ? args[0].replace(/\D/g, '') : '';
        if (rawTarget.startsWith('0')) {
          rawTarget = '62' + rawTarget.slice(1);
        }

        if (!rawTarget || rawTarget.length < 9) {
          return reply('📌 *Cara Tambah Member:*\nKetik: `.add 628xxxxxxxxxx` (Gunakan kode negara, misal 628xxx)');
        }

        const targetJid = `${rawTarget}@s.whatsapp.net`;

        // Cek apakah target sudah ada di grup
        const alreadyIn = participants.some(p => p.id.split('@')[0] === rawTarget);
        if (alreadyIn) {
          return reply(`ℹ️ Nomor @${rawTarget} sudah berada di dalam grup ini.`, null, {
            mentions: [targetJid]
          });
        }

        const res = await conn.groupParticipantsUpdate(m.chat, [targetJid], 'add');
        const status = res?.[0]?.status;

        if (status === '403') {
          return reply(`⚠️ Gagal menambahkan @${rawTarget} secara langsung karena privasi akun target. Silakan kirimkan link undangan grup kepadanya.`, null, {
            mentions: [targetJid]
          });
        } else if (status === '408' || status === '409') {
          return reply(`ℹ️ Nomor @${rawTarget} baru saja keluar dari grup ini atau sudah ada di dalam grup.`);
        } else {
          return reply(`✅ Berhasil menambahkan @${rawTarget} ke dalam grup!`, null, {
            mentions: [targetJid]
          });
        }
      }
    } catch (err) {
      console.error('❌ Error group admin command:', err);
      return reply('❌ Terjadi kesalahan: ' + (err?.message || err));
    }
  }
};
