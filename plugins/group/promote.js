'use strict';

const { findParticipant, getBotParticipant, getSenderParticipant, stripJid } = require('../../lib/group-helper.js');

module.exports = {
  name: 'promote',
  aliases: ['demote', 'jadikanadmin', 'unadmin'],
  category: 'group',
  description: 'Mengangkat member menjadi admin (.promote) atau menurunkan admin (.demote).',
  usage: '.promote @mention / reply pesan atau .demote @mention / reply pesan',

  async run({ conn, m, command, args, reply }) {
    if (!m.isGroup) {
      return reply('❌ Fitur ini hanya dapat digunakan di dalam grup WhatsApp.');
    }

    const groupMetadata = await conn.groupMetadata(m.chat);
    const participants = groupMetadata?.participants || [];

    const botParticipant = getBotParticipant(participants, conn);
    if (!botParticipant?.admin) {
      return reply('❌ Bot harus menjadi *Admin Grup* terlebih dahulu agar dapat mengubah status admin.');
    }

    const senderParticipant = getSenderParticipant(participants, m, conn);
    if (!senderParticipant?.admin && !m.fromMe) {
      return reply('❌ Perintah ini hanya dapat dijalankan oleh *Admin Grup*.');
    }

    let targetJid = null;
    const mentioned = m.mentionedJid || m.msg?.contextInfo?.mentionedJid || [];
    if (m.quoted?.sender) {
      targetJid = m.quoted.sender;
    } else if (mentioned[0]) {
      targetJid = mentioned[0];
    } else if (args[0]) {
      let cleanNum = args[0].replace(/\D/g, '');
      if (cleanNum.startsWith('0')) cleanNum = '62' + cleanNum.slice(1);
      if (cleanNum.length >= 8) targetJid = `${cleanNum}@s.whatsapp.net`;
    }

    if (!targetJid) {
      return reply(`📌 *Cara Penggunaan:*\nReply pesan target atau ketik: \`.${command} @mention\``);
    }

    const targetParticipant = findParticipant(participants, targetJid);
    if (!targetParticipant) {
      return reply(`⚠️ Nomor @${stripJid(targetJid)} tidak ditemukan di dalam grup ini.`, null, {
        mentions: [targetJid]
      });
    }

    const targetDisplay = stripJid(targetParticipant.phoneNumber || targetParticipant.id);
    const isPromote = ['promote', 'jadikanadmin'].includes(command.toLowerCase());

    if (isPromote) {
      if (targetParticipant.admin) {
        return reply(`ℹ️ @${targetDisplay} sudah menjadi *Admin Grup*.`, null, { mentions: [targetParticipant.id] });
      }
      await conn.groupParticipantsUpdate(m.chat, [targetParticipant.id], 'promote');
      return reply(`👑 Berhasil mengangkat @${targetDisplay} menjadi *Admin Grup*.`, null, {
        mentions: [targetParticipant.id]
      });
    } else {
      if (targetParticipant.id === botParticipant.id) {
        return reply('⚠️ Bot tidak bisa menurunkan jabatannya sendiri.');
      }
      if (!targetParticipant.admin) {
        return reply(`ℹ️ @${targetDisplay} memang bukan admin grup.`, null, { mentions: [targetParticipant.id] });
      }
      await conn.groupParticipantsUpdate(m.chat, [targetParticipant.id], 'demote');
      return reply(`📉 Berhasil menurunkan @${targetDisplay} dari jabatan *Admin Grup*.`, null, {
        mentions: [targetParticipant.id]
      });
    }
  }
};
