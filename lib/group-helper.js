'use strict';

function stripJid(jid) {
  return String(jid || '').replace(/:\d+@/, '@').split('@')[0];
}

/**
 * Cari participant di groupMetadata.participants dengan mendukung format @s.whatsapp.net maupun @lid
 */
function findParticipant(participants = [], targetJid, extraLid = '') {
  const targetNum = stripJid(targetJid);
  const lidNum = stripJid(extraLid);

  return participants.find((p) => {
    const ids = [p.id, p.lid, p.phoneNumber, p.jid].map(stripJid).filter(Boolean);
    return (targetNum && ids.includes(targetNum)) || (lidNum && ids.includes(lidNum));
  }) || null;
}

function getBotParticipant(participants = [], conn) {
  return findParticipant(participants, conn?.user?.id, conn?.user?.lid);
}

function getSenderParticipant(participants = [], m, conn) {
  if (m.fromMe) return getBotParticipant(participants, conn);
  return findParticipant(participants, m.sender, m.key?.participantAlt || '');
}

module.exports = {
  stripJid,
  findParticipant,
  getBotParticipant,
  getSenderParticipant
};
