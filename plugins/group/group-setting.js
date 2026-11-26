'use strict';

const { getBotParticipant, getSenderParticipant } = require('../../lib/group-helper.js');

module.exports = [
  {
    name: 'open',
    aliases: ['close', 'bukagrup', 'tutupgrup'],
    category: 'group',
    description: 'Membuka (.open) atau menutup (.close) pengiriman pesan di grup.',
    usage: '.open atau .close',

    run: async ({ conn, m, command, reply }) => {
      if (!m.isGroup) return reply('❌ Fitur ini hanya dapat digunakan di dalam grup.');

      const groupMetadata = await conn.groupMetadata(m.chat);
      const participants = groupMetadata?.participants || [];

      const botParticipant = getBotParticipant(participants, conn);
      if (!botParticipant?.admin) {
        return reply('❌ Bot harus menjadi *Admin Grup* terlebih dahulu.');
      }

      const senderParticipant = getSenderParticipant(participants, m, conn);
      if (!senderParticipant?.admin && !m.fromMe) {
        return reply('❌ Perintah ini hanya dapat dijalankan oleh *Admin Grup*.');
      }

      const isOpen = ['open', 'bukagrup'].includes(command.toLowerCase());
      await conn.groupSettingUpdate(m.chat, isOpen ? 'not_announcement' : 'announcement');
      return reply(
        isOpen
          ? '🔓 *Grup Dibuka!* Semua anggota sekarang dapat mengirim pesan.'
          : '🔒 *Grup Ditutup!* Hanya *Admin Grup* yang dapat mengirim pesan.'
      );
    }
  },

  {
    name: 'del',
    aliases: ['delete', 'hapus'],
    category: 'group',
    description: 'Menghapus pesan bot atau pesan member lain yang di-reply.',
    usage: 'Reply pesan lalu ketik .del',

    run: async ({ conn, m, reply }) => {
      if (!m.quoted) {
        return reply('📌 Reply pesan yang ingin dihapus dengan perintah `.del`.');
      }

      const quotedFromMe = !!m.quoted.fromMe;
      if (!quotedFromMe && m.isGroup) {
        const groupMetadata = await conn.groupMetadata(m.chat);
        const participants = groupMetadata?.participants || [];
        const botParticipant = getBotParticipant(participants, conn);
        const senderParticipant = getSenderParticipant(participants, m, conn);

        if (!senderParticipant?.admin && !m.fromMe) {
          return reply('❌ Hanya *Admin Grup* yang dapat menghapus pesan anggota lain.');
        }
        if (!botParticipant?.admin) {
          return reply('❌ Bot harus menjadi *Admin Grup* untuk menghapus pesan anggota lain.');
        }
      }

      const key = {
        remoteJid: m.chat,
        fromMe: quotedFromMe,
        id: m.quoted.id,
        participant: m.quoted.sender
      };

      await conn.sendMessage(m.chat, { delete: key });
    }
  }
];
