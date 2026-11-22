'use strict'

const {
  default: _makeWaSocket,
  jidDecode,
  areJidsSameUser
} = require('@whiskeysockets/baileys')

function makeWASocket(connectionOptions) {
  const conn = _makeWaSocket(connectionOptions)

  conn.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/i.test(jid)) {
      const decoded = jidDecode(jid) || {}
      return (decoded.user && decoded.server)
        ? `${decoded.user}@${decoded.server}`
        : jid
    }
    return jid
  }

  conn.reply = (jid, text, quoted, options = {}) =>
    conn.sendMessage(jid, { text: String(text ?? '') }, { quoted, ...options })

  return conn
}

async function smsg(conn, m) {
  if (!m) return m

  if (m.key) {
    m.id = m.key.id
    m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16
    m.chat = m.key.remoteJid || ''
    m.fromMe = !!m.key.fromMe
    m.isGroup = m.chat.endsWith('@g.us')
    m.sender = conn.decodeJid(
      (m.fromMe && conn.user?.id) ||
      m.participant ||
      m.key.participant ||
      m.chat || ''
    )
  }

  if (m.message) {
    let message = m.message
    let mtype = Object.keys(message)[0]

    if (mtype === 'ephemeralMessage' && message.ephemeralMessage?.message) {
      message = message.ephemeralMessage.message
      mtype = Object.keys(message)[0]
    }

    if (mtype === 'viewOnceMessageV2' && message.viewOnceMessageV2?.message) {
      message = message.viewOnceMessageV2.message
      mtype = Object.keys(message)[0]
    }

    const msg = message[mtype] || {}
    m.mtype = mtype
    m.msg = msg

    const text = typeof msg === 'string'
      ? msg
      : msg.text ||
        msg.caption ||
        message.conversation ||
        msg.contentText ||
        msg.selectedDisplayText ||
        msg.title || ''

    m.text = String(text || '')

    const context = msg.contextInfo
    if (context?.quotedMessage) {
      const quotedType = Object.keys(context.quotedMessage)[0]
      const quotedData = context.quotedMessage[quotedType]
      if (quotedData) {
        m.quoted = typeof quotedData === 'string' ? { text: quotedData } : { ...quotedData }
        m.quoted.mtype = quotedType
        m.quoted.id = context.stanzaId
        m.quoted.chat = context.remoteJid || m.chat
        m.quoted.sender = conn.decodeJid(context.participant || '')
        m.quoted.fromMe = areJidsSameUser(m.quoted.sender, conn.decodeJid(conn.user?.id || ''))
        m.quoted.text = m.quoted.text || m.quoted.caption || ''
        m.quoted.reply = (text, chatId, options) =>
          conn.reply(chatId || m.chat, text, m.quoted, options)
      }
    }
  }

  m.reply = (text, chatId, options) =>
    conn.reply(chatId || m.chat, text, m, options)

  return m
}

function bind() {
  // Dipertahankan sebagai compatibility hook untuk source lama.
}

module.exports = { makeWASocket, smsg, bind }
