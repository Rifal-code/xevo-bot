'use strict';

const { getSenderParticipant, stripJid } = require('../../lib/group-helper.js');

module.exports = [
  {
    name: 'hidetag',
    aliases: ['ht', 'h'],
    category: 'group',
    description: 'Kirim pengumuman ke seluruh anggota grup tanpa menampilkan daftar @tag.',
    usage: '.hidetag <pesan>',

    run: async ({ conn, m, text, reply }) => {
      if (!m.isGroup) return reply('❌ Fitur ini hanya dapat digunakan di dalam grup.');

      const groupMetadata = await conn.groupMetadata(m.chat);
      const participants = groupMetadata?.participants || [];

      const senderParticipant = getSenderParticipant(participants, m, conn);
      if (!senderParticipant?.admin && !m.fromMe) {
        return reply('❌ Perintah `.hidetag` hanya dapat digunakan oleh *Admin Grup*.');
      }

      const messageText = (text || '').trim() || (m.quoted?.text || '').trim();
      if (!messageText) {
        return reply('⚠️ Masukkan pesan pengumuman!\nContoh: `.hidetag Besok kumpul jam 8 pagi`');
      }

      const mentions = participants.map(p => p.id);
      await conn.sendMessage(m.chat, {
        text: messageText,
        mentions
      }, { quoted: m });
    }
  },

  {
    name: 'tagall',
    aliases: ['everyone', 'all'],
    category: 'group',
    description: 'Mention seluruh anggota grup beserta daftar nomornya.',
    usage: '.tagall [pesan]',

    run: async ({ conn, m, text, reply }) => {
      if (!m.isGroup) return reply('❌ Fitur ini hanya dapat digunakan di dalam grup.');

      const groupMetadata = await conn.groupMetadata(m.chat);
      const participants = groupMetadata?.participants || [];

      const senderParticipant = getSenderParticipant(participants, m, conn);
      if (!senderParticipant?.admin && !m.fromMe) {
        return reply('❌ Perintah `.tagall` hanya dapat digunakan oleh *Admin Grup*.');
      }

      const title = (text || '').trim() || 'Perhatian semuanya!';
      const mentions = participants.map(p => p.id);
      const lines = [
        `📢 *TAG ALL (${participants.length} Member)*`,
        `💬 *Pesan:* ${title}`,
        ''
      ];
      participants.forEach((p, idx) => {
        lines.push(`${idx + 1}. @${p.id.split('@')[0]}`);
      });

      await conn.sendMessage(m.chat, {
        text: lines.join('\n'),
        mentions
      }, { quoted: m });
    }
  }
];
