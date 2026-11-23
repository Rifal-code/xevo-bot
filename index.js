/*
  Xevo Bot multi-session pairing
  Each WhatsApp number gets its own auth folder under ./auth/<number>.
*/
const fs = require('fs')
const path = require('path')
const baileys = require('@whiskeysockets/baileys')
const { useMultiFileAuthState, DisconnectReason } = baileys
const Browsers = baileys.Browsers || { ubuntu: (name = 'Chrome') => ['Ubuntu', name, '1.0.0'] }
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const { smsg, makeWASocket: makeWASocketSimple } = require('./lib/msg.js')
let handleMessage = require('./Xevo.js')

// Filter error berisik dari libsignal internal (Bad MAC / MessageCounterError / ratchet failure)
// agar tidak mencemari log Railway dan tidak memicu warning merah palsu.
const _origConsoleError = console.error
const _origConsoleWarn = console.warn

console.error = function (...args) {
  const msg = args.map(a => (a && a.stack ? a.stack : String(a || ''))).join(' ')
  if (
    msg.includes('Bad MAC') ||
    msg.includes('MessageCounterError') ||
    msg.includes('Failed to decrypt message with any known session') ||
    msg.includes('session_cipher.js') ||
    msg.includes('queue_job.js') ||
    msg.includes('Session error:')
  ) {
    return
  }
  _origConsoleError.apply(console, args)
}

console.warn = function (...args) {
  const msg = args.map(a => String(a || '')).join(' ')
  if (msg.includes('Failed to newsletter follow, unexpected response structure')) {
    return
  }
  _origConsoleWarn.apply(console, args)
}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Engine uncaughtException]:', err?.message || err)
})
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Engine unhandledRejection]:', reason?.message || reason)
})

const AUTH_ROOT = path.join(__dirname, 'auth')
const DATA_DIR = path.join(__dirname, 'data')
const PROCESSED_MSGS_FILE = path.join(DATA_DIR, 'processed_msgs.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000)
const sessions = new Map()
const pairingLocks = new Map()
const messageStore = new Map() // Cache pesan untuk menangani retry/pre-key WhatsApp E2EE

// Cache & persist ID pesan untuk mencegah replay / duplikasi saat restart atau redeploy
const processedMsgIds = new Set()

try {
  if (fs.existsSync(PROCESSED_MSGS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PROCESSED_MSGS_FILE, 'utf8'))
    if (Array.isArray(raw)) {
      for (const id of raw.slice(-2000)) processedMsgIds.add(id)
    }
  }
} catch { }

let saveProcessedMsgTimeout = null
function persistProcessedMsgIds() {
  if (saveProcessedMsgTimeout) return
  saveProcessedMsgTimeout = setTimeout(() => {
    saveProcessedMsgTimeout = null
    try {
      const arr = Array.from(processedMsgIds).slice(-2000)
      fs.writeFileSync(PROCESSED_MSGS_FILE, JSON.stringify(arr), 'utf8')
    } catch { }
  }, 3000)
}

function storeMessage(keyId, message) {
  if (!keyId || !message) return
  if (messageStore.size > 2500) {
    const firstKey = messageStore.keys().next().value
    messageStore.delete(firstKey)
  }
  messageStore.set(keyId, message)
}

function isMessageProcessed(id) {
  return processedMsgIds.has(id)
}

function markMessageProcessed(id) {
  if (!id) return
  if (processedMsgIds.size > 3000) {
    const firstKey = processedMsgIds.values().next().value
    processedMsgIds.delete(firstKey)
  }
  processedMsgIds.add(id)
  persistProcessedMsgIds()
}

const PAIRING_TIMEOUT_MS = Number(process.env.PAIRING_TIMEOUT_MS || 120000)
const MAX_RECONNECT_ATTEMPTS = Number(process.env.MAX_RECONNECT_ATTEMPTS || 5)

// Channel WhatsApp yang otomatis di-follow setiap sesi berhasil terhubung.
const AUTO_FOLLOW_CHANNELS = [
  '120363422066682134@newsletter',
  '120363431536200221@newsletter',
  '120363430636815858@newsletter'
]

const FOLLOWED_CHANNELS_FILE = path.join(DATA_DIR, 'followed_channels.json')
const followedChannels = new Map()

try {
  if (fs.existsSync(FOLLOWED_CHANNELS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(FOLLOWED_CHANNELS_FILE, 'utf8'))
    if (typeof raw === 'object' && raw !== null) {
      for (const [num, list] of Object.entries(raw)) {
        if (Array.isArray(list)) followedChannels.set(num, new Set(list))
      }
    }
  }
} catch {}

function saveFollowedChannels() {
  try {
    const obj = {}
    for (const [num, set] of followedChannels.entries()) {
      obj[num] = Array.from(set)
    }
    fs.writeFileSync(FOLLOWED_CHANNELS_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch {}
}

function isChannelFollowed(number, jid) {
  return !!followedChannels.get(number)?.has(jid)
}

function markChannelFollowed(number, jid) {
  if (!followedChannels.has(number)) {
    followedChannels.set(number, new Set())
  }
  followedChannels.get(number).add(jid)
  saveFollowedChannels()
}

async function autoFollowChannels(conn, number) {
  if (!AUTO_FOLLOW_CHANNELS.length) return
  if (typeof conn?.newsletterFollow !== 'function') return

  for (const jid of AUTO_FOLLOW_CHANNELS) {
    // Jika nomor ini sudah pernah tercatat follow channel ini, lewati agar tidak error di WhatsApp
    if (isChannelFollowed(number, jid)) {
      continue
    }

    try {
      await conn.newsletterFollow(jid)
      markChannelFollowed(number, jid)
      console.log(`📢 Berhasil follow channel: ${jid} | akun ${number}`)
    } catch (err) {
      const msg = String(err?.message || err || '')
      // WhatsApp melempar 'unexpected response structure' jika akun sudah follow channel tersebut sebelumnya
      if (msg.includes('unexpected response structure') || msg.includes('already following')) {
        markChannelFollowed(number, jid)
        console.log(`ℹ️ Akun ${number} sudah terdaftar mengikuti channel ${jid}`)
      } else {
        console.log(`ℹ️ Lewati follow channel ${jid} untuk ${number}: ${msg.slice(0, 150)}`)
      }
    }
  }
}

if (!fs.existsSync(AUTH_ROOT)) fs.mkdirSync(AUTH_ROOT, { recursive: true })

function reload(file) {
  const filePath = path.resolve(file)
  fs.watchFile(filePath, () => {
    fs.unwatchFile(filePath)
    console.log(`Reloaded: ${file}`)
    delete require.cache[require.resolve(file)]
    try {
      if (file.includes('Xevo.js')) handleMessage = require('./Xevo.js')
      else if (file.includes('msg.js')) delete require.cache[require.resolve('./lib/msg.js')]
      reload(file)
    } catch (err) {
      console.log(`❌ Error reload ${file}:`, err)
    }
  })
}
reload('./Xevo.js')
reload('./lib/msg.js')

function cleanNumber(phoneNumber) {
  let number = String(phoneNumber || '').replace(/\D/g, '')
  if (number.startsWith('0')) number = '62' + number.slice(1)
  return number
}

function isValidNumber(number) {
  return /^\d{8,15}$/.test(number)
}

function getSessionPath(number) {
  return path.join(AUTH_ROOT, number)
}

function sessionInfo(number) {
  const item = sessions.get(number)
  return {
    number,
    connected: !!item?.connected,
    registered: !!item?.state?.creds?.registered
  }
}

// Hanya tampilkan sesi yang benar-benar aktif/terdaftar.
// Folder auth kosong atau pairing gagal tidak akan muncul sebagai WAITING.
function listSessions() {
  return [...sessions.entries()]
    .filter(([, item]) => item?.state?.creds?.registered || item?.connected)
    .map(([number]) => sessionInfo(number))
    .sort((a, b) => a.number.localeCompare(b.number))
}

async function safeCloseSocket(conn) {
  if (!conn) return
  try {
    if (conn.ev?.removeAllListeners) conn.ev.removeAllListeners()
    if (typeof conn.end === 'function') {
      conn.end(undefined)
    } else if (conn.ws?.close) {
      conn.ws.close()
    }
  } catch { }
}

async function disconnectSession(number) {
  number = cleanNumber(number)
  const session = sessions.get(number)

  if (session) {
    session.manualDisconnect = true
    session.connected = false
    session.reconnecting = false
    if (session.reconnectTimeout) clearTimeout(session.reconnectTimeout)
    if (session.pairingTimeout) clearTimeout(session.pairingTimeout)
    await safeCloseSocket(session.conn)
  }

  sessions.delete(number)
  pairingLocks.delete(number)
  console.log(`🔌 Sesi diputus sementara (kredensial auth dipertahankan): ${number}`)
}

async function reconnectSession(number) {
  number = cleanNumber(number)
  const authPath = getSessionPath(number)
  const credsPath = path.join(authPath, 'creds.json')

  let hasCreds = false
  try {
    const creds = JSON.parse(await fs.promises.readFile(credsPath, 'utf8'))
    hasCreds = creds?.registered === true
  } catch {
    hasCreds = false
  }

  if (!hasCreds) {
    throw new Error('Kredensial sesi tidak ditemukan di server. Silakan tautkan ulang nomor.')
  }

  const old = sessions.get(number)
  if (old) {
    old.removed = true
    await safeCloseSocket(old.conn)
    sessions.delete(number)
  }

  return await startSession(number)
}

async function removeSession(number, reason = 'unknown') {
  number = cleanNumber(number)
  const session = sessions.get(number)
  const authPath = getSessionPath(number)

  if (session) {
    session.removed = true
    session.connected = false
    session.reconnecting = false
    if (session.reconnectTimeout) clearTimeout(session.reconnectTimeout)
    if (session.pairingTimeout) clearTimeout(session.pairingTimeout)
    await safeCloseSocket(session.conn)
  }

  sessions.delete(number)
  pairingLocks.delete(number)

  try {
    await fs.promises.rm(authPath, { recursive: true, force: true })
    console.log(`🗑️ Session dihapus (${reason}): ${number}`)
  } catch (err) {
    console.error(`❌ Gagal menghapus auth (${number}):`, err)
  }
}

async function startSession(number, options = {}) {
  number = cleanNumber(number)
  if (!isValidNumber(number)) throw new Error('Nomor WhatsApp tidak valid.')

  const existing = sessions.get(number)
  if (existing?.conn && !existing.removed) return existing

  const authPath = getSessionPath(number)
  fs.mkdirSync(authPath, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(authPath)

  const session = {
    number,
    conn: null,
    state,
    saveCreds,
    connected: false,
    connectedAt: Math.floor(Date.now() / 1000),
    reconnectTimeout: null,
    pairingTimeout: null,
    reconnecting: false,
    reconnectAttempts: 0,
    removed: false,
    // Pending hanya untuk sesi baru yang sedang menunggu user memasukkan code.
    pendingPairing: options.pendingPairing === true
  }

  const conn = makeWASocketSimple({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    auth: state,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      const msg = messageStore.get(key.id)
      return msg || undefined
    }
  })

  // Hook sendMessage agar pesan yang dikirim bot disimpan untuk permintaan retry E2EE WhatsApp HP
  const originalSendMessage = conn.sendMessage.bind(conn)
  conn.sendMessage = async (...args) => {
    const res = await originalSendMessage(...args)
    if (res?.key?.id) {
      if (res.message) storeMessage(res.key.id, res.message)
      markMessageProcessed(res.key.id)
    }
    return res
  }

  session.conn = conn
  sessions.set(number, session)

  conn.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      // Abaikan sync riwayat pesan lama / app state sync (hanya terima 'notify' realtime)
      if (chatUpdate.type !== 'notify') return

      for (const m of chatUpdate.messages || []) {
        if (!m?.message || m.key?.remoteJid === 'status@broadcast') continue

        const msgId = m.key?.id

        if (msgId && m.message) {
          storeMessage(msgId, m.message)
        }

        // Cegah eksekusi ulang pesan yang sudah pernah diproses
        if (msgId && isMessageProcessed(msgId)) {
          continue
        }

        // Ekstrak & normalisasi timestamp pesan
        const rawTime = m.messageTimestamp
        let msgTimestamp = 0
        if (rawTime) {
          if (typeof rawTime === 'object') {
            if (typeof rawTime.toNumber === 'function') {
              msgTimestamp = rawTime.toNumber()
            } else if (rawTime.low !== undefined) {
              msgTimestamp = rawTime.low >>> 0
            }
          } else {
            msgTimestamp = Number(rawTime) || 0
          }
          if (msgTimestamp > 1e11) {
            msgTimestamp = Math.floor(msgTimestamp / 1000)
          }
        }

        const nowSeconds = Math.floor(Date.now() / 1000)

        // 1. Abaikan pesan yang dikirim sebelum server ini boot/restart (toleransi 2 detik)
        if (msgTimestamp && msgTimestamp < (SERVER_BOOT_TIME - 2)) {
          if (msgId) markMessageProcessed(msgId)
          continue
        }

        // 2. Abaikan pesan dari masa lalu yang dikirim sebelum sesi bot ini terkoneksi (toleransi 2 detik)
        if (session.connectedAt && msgTimestamp && (msgTimestamp < (session.connectedAt - 2))) {
          if (msgId) markMessageProcessed(msgId)
          continue
        }

        // 3. Abaikan pesan yang sudah lebih dari 25 detik (mencegah replay message dari antrean server)
        if (msgTimestamp && (nowSeconds - msgTimestamp > 25)) {
          if (msgId) markMessageProcessed(msgId)
          continue
        }

        if (msgId) markMessageProcessed(msgId)

        const processedMsg = await smsg(conn, m)
        if (processedMsg) await handleMessage(conn, processedMsg)
      }
    } catch (err) {
      console.error(`❌ messages.upsert error (${number}):`, err)
    }
  })

  conn.ev.on('creds.update', async () => {
    try {
      await saveCreds()

      // Setelah WhatsApp berhasil menautkan perangkat, sesi bukan lagi pending.
      if (session.state?.creds?.registered) {
        session.pendingPairing = false
        if (session.pairingTimeout) clearTimeout(session.pairingTimeout)
        session.pairingTimeout = null
      }
    } catch (err) {
      console.error(`❌ saveCreds error (${number}):`, err)
    }
  })

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (session.removed) return

    if (connection === 'open') {
      session.connected = true
      session.connectedAt = Math.floor(Date.now() / 1000)
      session.reconnecting = false
      session.reconnectAttempts = 0
      session.pendingPairing = false
      if (session.reconnectTimeout) clearTimeout(session.reconnectTimeout)
      if (session.pairingTimeout) clearTimeout(session.pairingTimeout)
      session.reconnectTimeout = null
      session.pairingTimeout = null
      console.log(`✅ Connected to WhatsApp: ${number}`)

      // Follow channel dilakukan setelah socket benar-benar OPEN.
      // Setiap error di sini diisolasi agar tidak memutus sesi WhatsApp.
      await autoFollowChannels(conn, number)
      return
    }

    if (connection === 'close') {
      session.connected = false
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      const registered = !!session.state?.creds?.registered

      // User sengaja menekan PUTUS di dashboard: jangan reconnect otomatis dan JANGAN hapus auth
      if (session.manualDisconnect) {
        console.log(`🔌 Sesi ${number} dimatikan manual oleh pengguna (kredensial auth aman).`)
        return
      }

      // Hanya hapus auth jika WhatsApp HP sengaja menekan Log Out / Keluar
      // atau jika saat pairing baru pertama kali gagal sebelum tertaut
      if (loggedOut || (!registered && session.pendingPairing)) {
        const reason = loggedOut ? 'logged_out_from_device' : 'pairing_failed_or_not_linked'
        console.log(`🗑️ Hapus sesi ${number}: ${reason}`)
        await removeSession(number, reason)
        return
      }

      // Sesi yang sudah terdaftar: coba reconnect untuk gangguan koneksi sementara
      if (session.reconnecting) return
      session.reconnecting = true
      session.reconnectAttempts += 1

      if (session.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.log(`⏸️ Reconnect otomatis dijeda untuk ${number}. Kredensial auth tetap disimpan.`)
        session.reconnecting = false
        return
      }

      if (session.reconnectTimeout) clearTimeout(session.reconnectTimeout)
      session.reconnectTimeout = setTimeout(async () => {
        if (session.removed || session.manualDisconnect) return
        sessions.delete(number)
        try {
          await startSession(number)
        } catch (err) {
          console.error(`❌ Reconnect error (${number}):`, err)
        }
      }, 5000)
    }
  })

  return session
}

async function requestPairing(phoneNumber) {
  const number = cleanNumber(phoneNumber)
  if (!isValidNumber(number)) throw new Error('Nomor WhatsApp tidak valid. Gunakan format internasional, misalnya 628xxxxxxxxxx.')

  if (pairingLocks.has(number)) return pairingLocks.get(number)

  const job = (async () => {
    let session
    try {
      session = await startSession(number, { pendingPairing: true })

      if (session.state?.creds?.registered) {
        throw new Error('Nomor ini sudah tertaut. Logout/hapus session lama terlebih dahulu jika ingin menautkan ulang.')
      }

      // Jika user tidak menyelesaikan pairing, hapus sesi otomatis.
      if (session.pairingTimeout) clearTimeout(session.pairingTimeout)
      session.pairingTimeout = setTimeout(() => {
        const current = sessions.get(number)
        if (current && !current.connected && !current.state?.creds?.registered) {
          removeSession(number, 'pairing_timeout').catch(err => console.error(err))
        }
      }, PAIRING_TIMEOUT_MS)

      // Tunggu socket siap sebelum meminta pairing code.
      await new Promise(resolve => setTimeout(resolve, 1200))
      if (session.removed || sessions.get(number) !== session) {
        throw new Error('Koneksi pairing ditutup sebelum kode dibuat. Silakan coba lagi.')
      }

      const code = await session.conn.requestPairingCode(number)
      if (!code) throw new Error('WhatsApp belum memberikan pairing code. Coba generate ulang beberapa detik lagi.')

      return { code, number }
    } catch (err) {
      // Jangan tinggalkan folder auth atau kartu session ketika generate code gagal.
      await removeSession(number, 'pairing_request_failed')
      throw err
    }
  })()

  pairingLocks.set(number, job)
  try {
    return await job
  } finally {
    pairingLocks.delete(number)
  }
}

async function cleanupUnregisteredAuthFolders() {
  const entries = fs.readdirSync(AUTH_ROOT, { withFileTypes: true })
    .filter(x => x.isDirectory() && isValidNumber(x.name))

  for (const entry of entries) {
    const credsPath = path.join(AUTH_ROOT, entry.name, 'creds.json')
    let registered = false
    try {
      const creds = JSON.parse(await fs.promises.readFile(credsPath, 'utf8'))
      registered = creds?.registered === true
    } catch {
      registered = false
    }

    if (!registered) {
      await fs.promises.rm(path.join(AUTH_ROOT, entry.name), { recursive: true, force: true })
      console.log(`🧹 Menghapus auth pairing yang belum tertaut: ${entry.name}`)
    }
  }
}

async function connectExistingSessions() {
  await cleanupUnregisteredAuthFolders()

  const entries = fs.readdirSync(AUTH_ROOT, { withFileTypes: true })
    .filter(x => x.isDirectory() && isValidNumber(x.name))
    .map(x => x.name)

  for (const number of entries) {
    try {
      await startSession(number)
    } catch (err) {
      console.warn(`⚠️ Startup session skipped (${number}):`, err?.message || err)
    }
  }

  console.log(entries.length === 0
    ? 'ℹ️ Belum ada sesi WhatsApp. Tambahkan nomor dari Xevo Dashboard.'
    : `ℹ️ Memuat ${entries.length} sesi WhatsApp...`)
}

connectExistingSessions().catch(err => console.error('❌ Startup error:', err))

module.exports = { requestPairing, startSession, listSessions, connectExistingSessions, removeSession, disconnectSession, reconnectSession }
