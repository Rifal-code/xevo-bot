'use strict';

const { setAfk } = require('../../lib/afk.js');

module.exports = {
  name: 'afk',
  aliases: ['away'],
  category: 'tools',
  description: 'Tandai status AFK dengan alasan agar bot membalas otomatis saat kamu di-tag.',
  usage: '.afk [alasan]',

  run: async ({ m, text, reply }) => {
    const reason = (text || '').trim() || 'Sedang sibuk / AFK';
    setAfk(m.sender, reason);
    const num = String(m.sender || '').split('@')[0];
    return reply(`💤 *@${num}* sekarang sedang *AFK*\n📝 Alasan: _${reason}_\n\n_Bot akan otomatis memberi tahu jika ada yang me-mention atau membalas pesanmu._`, null, {
      mentions: [m.sender]
    });
  }
};
