'use strict';

const groupDb = require('../../lib/group-db.js');

module.exports = {
  name: 'antilink',
  aliases: ['anti-link'],
  category: 'group',
  description: 'Mengaktifkan atau menonaktifkan fitur anti-link grup WhatsApp.',
  usage: '.antilink <on/off>',

  async run({ conn, m, args, reply }) {
    if (!m.isGroup) {
      return reply('❌ Fitur ini hanya dapat digunakan di dalam grup WhatsApp.');
    }

    try {
      const groupMetadata = await conn.groupMetadata(m.chat);
      const participants = groupMetadata?.participants || [];
      const botNumber = (conn.user?.id || '').replace(/:\d+@/, '@').split('@')[0];
      const botParticipant = participants.find(p => p.id.split('@')[0] === botNumber);
      const isBotAdmin = !!botParticipant?.admin;

      const senderNumber = (m.sender || '').split('@')[0];
      const senderParticipant = participants.find(p => p.id.split('@')[0] === senderNumber);
      const isSenderAdmin = !!senderParticipant?.admin;

      if (!isSenderAdmin) {
        return reply('❌ Hanya *Admin Grup* yang berhak mengaktifkan atau menonaktifkan anti-link.');
      }

      const action = (args[0] || '').toLowerCase();
      if (!['on', 'off', 'enable', 'disable', '1', '0'].includes(action)) {
        const current = groupDb.isAntilinkEnabled(m.chat);
        return reply([
          '🛡️ *PENGATURAN ANTI-LINK GRUP*',
          `Status saat ini: *${current ? 'AKTIF (ON) 🟢' : 'NONAKTIF (OFF) 🔴'}*`,
          '',
          '💡 *Cara Penggunaan:*',
          '• `.antilink on` — Mengaktifkan perlindungan anti-link',
          '• `.antilink off` — Menonaktifkan anti-link',
          '',
          isBotAdmin 
            ? '✅ Bot sudah menjadi Admin grup (dapat menghapus pesan otomatis).'
            : '⚠️ _Catatan: Jadikan bot sebagai Admin grup agar bot bisa menghapus link secara otomatis._'
        ].join('\n'));
      }

      const enable = ['on', 'enable', '1'].includes(action);
      groupDb.setGroupConfig(m.chat, { antilink: enable });

      if (enable) {
        const warningAdmin = !isBotAdmin ? '\n\n⚠️ *Perhatian:* Jadikan bot sebagai Admin agar bot memiliki wewenang untuk menghapus link secara otomatis!' : '';
        return reply(`🛡️ *ANTI-LINK DIAKTIFKAN*\nSetiap link grup WhatsApp yang dikirimkan oleh member biasa akan otomatis dihapus oleh bot.${warningAdmin}`);
      } else {
        return reply('🛡️ *ANTI-LINK DINONAKTIFKAN*\nMember grup sekarang bebas mengirimkan link.');
      }
    } catch (err) {
      console.error('❌ Error antilink command:', err);
      return reply('❌ Terjadi kesalahan saat memeriksa data grup: ' + (err?.message || err));
    }
  }
};
