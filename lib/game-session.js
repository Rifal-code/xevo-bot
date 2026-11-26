'use strict';

/**
 * Manajemen sesi game teks interaktif per chat (grup maupun pribadi).
 * Mendukung game satu jawaban (caklontong, susunkata, siapakahaku)
 * dan game banyak jawaban (family100).
 */
const activeGames = new Map();

function normalizeAnswer(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getGame(chatId) {
  return activeGames.get(chatId) || null;
}

function clearGame(chatId) {
  const g = activeGames.get(chatId);
  if (g && g.timer) clearTimeout(g.timer);
  activeGames.delete(chatId);
}

function startGame(chatId, gameData, onTimeout) {
  clearGame(chatId);
  const timeoutMs = gameData.timeoutMs || 60000;
  const timer = setTimeout(async () => {
    const current = activeGames.get(chatId);
    if (!current) return;
    activeGames.delete(chatId);
    if (typeof onTimeout === 'function') {
      try {
        await onTimeout(current);
      } catch { }
    }
  }, timeoutMs);

  const session = {
    ...gameData,
    startedAt: Date.now(),
    timer
  };
  activeGames.set(chatId, session);
  return session;
}

/**
 * Cek apakah pesan chat merupakan jawaban dari game yang sedang aktif.
 * Mengembalikan true jika pesan diproses sebagai jawaban game.
 */
async function handleGameMessage(m, reply) {
  const game = activeGames.get(m.chat);
  if (!game) return false;

  const guess = normalizeAnswer(m.text);
  if (!guess) return false;

  const senderNum = String(m.sender || '').split('@')[0];

  if (game.type === 'family100') {
    const idx = game.answers.findIndex((ans, i) => !game.found[i] && normalizeAnswer(ans) === guess);
    if (idx === -1) return false;

    game.found[idx] = senderNum;
    const remaining = game.found.filter(x => !x).length;

    const board = game.answers.map((ans, i) => {
      return game.found[i]
        ? `${i + 1}. ✅ *${ans}* (@${game.found[i]})`
        : `${i + 1}. ⬜ _..._`;
    }).join('\n');

    const mentions = [...new Set(game.found.filter(Boolean).map(n => `${n}@s.whatsapp.net`))];

    if (remaining === 0) {
      clearGame(m.chat);
      await reply(`🎉 *FAMILY 100 SELESAI!*\nSemua jawaban berhasil ditebak!\n\n${board}`, null, { mentions });
    } else {
      await reply(`✅ *BENAR!* @${senderNum} menebak *${game.answers[idx]}*\n\n${board}\n\n_Sisa ${remaining} jawaban lagi! Ketik .nyerah untuk menyerah._`, null, { mentions });
    }
    return true;
  }

  // Single-answer game
  if (normalizeAnswer(game.answer) === guess) {
    clearGame(m.chat);
    const extra = game.desc ? `\n💡 _${game.desc}_` : '';
    await reply(`🎉 *BENAR!* Selamat @${senderNum}!\nJawaban: *${game.answer}*${extra}`, null, {
      mentions: [m.sender]
    });
    return true;
  }

  return false;
}

function buildHint(answer) {
  return String(answer || '').replace(/[a-zA-Z0-9]/g, (ch, idx) => (idx % 3 === 0 ? ch : '_'));
}

module.exports = {
  getGame,
  clearGame,
  startGame,
  handleGameMessage,
  buildHint
};
