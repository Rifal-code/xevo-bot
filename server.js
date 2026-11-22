const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { requestPairing, listSessions, removeSession, disconnectSession, reconnectSession } = require('./index.js')

const PORT = Number(process.env.PORT) || 5004
const PUBLIC = path.join(__dirname, 'public')
const rate = new Map()
const CONFIG = path.join(__dirname, 'config.json')

const DATA_DIR = path.join(__dirname, 'database')
const USERS_FILE = path.join(DATA_DIR, 'web-users.json')
const CHAT_FILE = path.join(DATA_DIR, 'global-chat.json')
const webTokens = new Map()

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}
function writeJson(file, data) {
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(String(password), salt, 64).toString('hex') }
}
function safeUserName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24)
}
function getToken(req) {
  const auth = String(req.headers.authorization || '')
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim()
  const cookie = String(req.headers.cookie || '')
  const m = cookie.match(/(?:^|;\s*)xevo_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}
function authUser(req) {
  const token = getToken(req)
  const item = webTokens.get(token)
  if (!item || item.expires < Date.now()) {
    if (item) webTokens.delete(token)
    return null
  }
  item.expires = Date.now() + 1000 * 60 * 60 * 24 * 7
  return item.user
}
function cleanChatMessage(v) {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, 500)
}

const ENGINE_INTERNAL_SECRET = process.env.ENGINE_INTERNAL_SECRET || 'xevo_engine_secret_key_2026'

function isAuthorized(req) {
  const secretHeader = req.headers['x-engine-secret']
  if (secretHeader && secretHeader === ENGINE_INTERNAL_SECRET) return true
  const auth = String(req.headers.authorization || '')
  if (auth === `Bearer ${ENGINE_INTERNAL_SECRET}`) return true
  const user = authUser(req)
  if (user) return true
  return false
}
if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, [])
if (!fs.existsSync(CHAT_FILE)) writeJson(CHAT_FILE, [])


function getDashboardConfig() {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG, 'utf8'))
    return {
      profileImageUrl: String(data.profileImageUrl || data.heroImageUrl || ''),
      pairingImageUrl: String(data.pairingImageUrl || ''),
      developerName: String(data.developerName || 'Developer'),
      botName: String(data.botName || 'XevoBot'),
      botVersion: String(data.botVersion || 'v1.0.0'),
      mode: String(data.mode || 'public'),
      prefix: String(data.prefix || '.'),
      systemInfo: String(data.systemInfo || 'Xevo Web Pairing Panel'),
      supportUrl: String(data.supportUrl || 'https://saweria.co/')
    }
  } catch (err) {
    return { profileImageUrl: '', pairingImageUrl: '', developerName: 'Developer', botName: 'XevoBot', botVersion: 'v1.0.0', mode: 'public', prefix: '.', systemInfo: 'Xevo Web Pairing Panel', supportUrl: 'https://saweria.co/' }
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > 100000) {
        reject(new Error('Request terlalu besar.'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

function allowed(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim()
  const now = Date.now()
  const item = rate.get(ip) || { count: 0, reset: now + 60000 }
  if (now > item.reset) {
    item.count = 0
    item.reset = now + 60000
  }
  item.count += 1
  rate.set(ip, item)
  return item.count <= 10
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)


  // ===== GUEST ACCESS / GLOBAL CHAT =====
  if (req.method === 'POST' && url.pathname === '/api/web/guest') {
    if (!allowed(req)) return send(res, 429, JSON.stringify({success:false,message:'Terlalu banyak percobaan. Tunggu sebentar.'}))
    const id = crypto.randomUUID()
    const username = 'Guest-' + crypto.randomBytes(3).toString('hex').toUpperCase()
    const token = crypto.randomBytes(32).toString('hex')
    webTokens.set(token, { user:{ id, username }, expires:Date.now()+1000*60*60*24 })
    res.writeHead(200, {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'Set-Cookie':`xevo_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60*60*24}; HttpOnly; SameSite=Lax`,
      'X-Content-Type-Options':'nosniff'
    })
    return res.end(JSON.stringify({success:true,user:{id,username}}))
  }

  // ===== WEB LOGIN / GLOBAL CHAT (tambahan, tidak mengubah API lama) =====
  if (req.method === 'POST' && url.pathname === '/api/web/register') {
    if (!allowed(req)) return send(res, 429, JSON.stringify({ success:false, message:'Terlalu banyak percobaan. Tunggu sebentar.' }))
    try {
      const p = JSON.parse(await readBody(req) || '{}')
      const username = safeUserName(p.username)
      const password = String(p.password || '')
      if (!/^[A-Za-z0-9_ .-]{3,24}$/.test(username)) throw new Error('Username 3-24 karakter. Gunakan huruf, angka, spasi, _ . atau -.')
      if (password.length < 6 || password.length > 72) throw new Error('Password minimal 6 karakter.')
      const users = readJson(USERS_FILE, [])
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) throw new Error('Username sudah digunakan.')
      const hp = hashPassword(password)
      users.push({ id: crypto.randomUUID(), username, salt: hp.salt, hash: hp.hash, createdAt: Date.now() })
      writeJson(USERS_FILE, users)
      return send(res, 201, JSON.stringify({ success:true, message:'Akun berhasil dibuat. Silakan login.' }))
    } catch (err) {
      return send(res, 400, JSON.stringify({ success:false, message:err.message || 'Registrasi gagal.' }))
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/web/login') {
    if (!allowed(req)) return send(res, 429, JSON.stringify({ success:false, message:'Terlalu banyak percobaan. Tunggu sebentar.' }))
    try {
      const p = JSON.parse(await readBody(req) || '{}')
      const username = safeUserName(p.username)
      const password = String(p.password || '')
      const users = readJson(USERS_FILE, [])
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase())
      if (!user) throw new Error('Username atau password salah.')
      const hash = crypto.scryptSync(password, user.salt, 64).toString('hex')
      if (hash !== user.hash) throw new Error('Username atau password salah.')
      const token = crypto.randomBytes(32).toString('hex')
      webTokens.set(token, { user:{ id:user.id, username:user.username }, expires:Date.now()+1000*60*60*24*7 })
      res.writeHead(200, {
        'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store',
        'Set-Cookie':`xevo_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60*60*24*7}; HttpOnly; SameSite=Lax`,
        'X-Content-Type-Options':'nosniff'
      })
      return res.end(JSON.stringify({ success:true, user:{id:user.id,username:user.username}, token }))
    } catch (err) {
      return send(res, 401, JSON.stringify({ success:false, message:err.message || 'Login gagal.' }))
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/web/logout') {
    const token = getToken(req)
    if (token) webTokens.delete(token)
    res.writeHead(200, {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'Set-Cookie':'xevo_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
    })
    return res.end(JSON.stringify({success:true}))
  }

  if (req.method === 'GET' && url.pathname === '/api/web/me') {
    const user = authUser(req)
    return send(res, 200, JSON.stringify(user ? {success:true,user} : {success:false}))
  }

  if (req.method === 'GET' && url.pathname === '/api/chat/messages') {
    const user = authUser(req)
    if (!user) return send(res, 401, JSON.stringify({success:false,message:'Akses dashboard diperlukan.'}))
    const messages = readJson(CHAT_FILE, [])
    return send(res, 200, JSON.stringify({success:true,messages:messages.slice(-100)}))
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/messages') {
    const user = authUser(req)
    if (!user) return send(res, 401, JSON.stringify({success:false,message:'Akses dashboard diperlukan.'}))
    if (!allowed(req)) return send(res, 429, JSON.stringify({success:false,message:'Terlalu cepat. Tunggu sebentar.'}))
    try {
      const p = JSON.parse(await readBody(req) || '{}')
      const message = cleanChatMessage(p.message)
      if (!message) throw new Error('Pesan tidak boleh kosong.')
      const messages = readJson(CHAT_FILE, [])
      messages.push({id:crypto.randomUUID(), userId:user.id, username:user.username, message, time:Date.now()})
      writeJson(CHAT_FILE, messages.slice(-500))
      return send(res, 201, JSON.stringify({success:true}))
    } catch (err) {
      return send(res, 400, JSON.stringify({success:false,message:err.message || 'Gagal mengirim pesan.'}))
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/sessions') {
    if (!isAuthorized(req)) {
      return send(res, 401, JSON.stringify({ success: false, message: 'Unauthorized. Akses dashboard atau service token diperlukan.' }))
    }
    return send(res, 200, JSON.stringify({ success: true, sessions: listSessions() }))
  }

  if ((req.method === 'DELETE' || req.method === 'POST') && url.pathname.startsWith('/api/sessions/')) {
    if (!isAuthorized(req)) {
      return send(res, 401, JSON.stringify({ success: false, message: 'Unauthorized.' }))
    }
    const parts = url.pathname.split('/')
    const sessionNum = parts[3]
    const action = parts[4]
    if (!sessionNum) {
      return send(res, 400, JSON.stringify({ success: false, message: 'Nomor sesi tidak valid.' }))
    }
    try {
      if (action === 'reconnect') {
        await reconnectSession(sessionNum)
        return send(res, 200, JSON.stringify({ success: true, message: 'Sesi berhasil disambungkan kembali.' }))
      } else if (action === 'disconnect') {
        await disconnectSession(sessionNum)
        return send(res, 200, JSON.stringify({ success: true, message: 'Sesi berhasil diputus.' }))
      } else {
        await removeSession(sessionNum, 'user_delete')
        return send(res, 200, JSON.stringify({ success: true, message: 'Sesi berhasil dihapus.' }))
      }
    } catch (err) {
      return send(res, 500, JSON.stringify({ success: false, message: err?.message || 'Gagal memproses sesi.' }))
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard-stats') {
    if (!isAuthorized(req)) {
      return send(res, 401, JSON.stringify({ success: false, message: 'Unauthorized. Akses dashboard atau service token diperlukan.' }))
    }
    const sessions = listSessions()
    const connected = sessions.filter(s => s.connected).length
    const totalMem = os.totalmem()
    const usedMem = totalMem - os.freemem()
    return send(res, 200, JSON.stringify({
      success: true,
      total: sessions.length,
      connected,
      pairing: Math.max(0, sessions.length - connected),
      load: Number((os.loadavg()[0] || 0).toFixed(2)),
      ramUsed: usedMem,
      ramTotal: totalMem,
      uptime: Math.floor(process.uptime()),
    }))
  }

  // Proxy gambar profil/pairing dari Catbox. URL hanya berasal dari config milik owner.
  if (req.method === 'GET' && url.pathname.startsWith('/api/image/')) {
    const type = url.pathname.split('/').pop()
    const cfg = getDashboardConfig()
    const raw = type === 'profile' ? cfg.profileImageUrl : (type === 'pairing' ? cfg.pairingImageUrl : '')
    if (!raw) return send(res, 404, 'Image not configured', 'text/plain; charset=utf-8')
    let target
    try { target = new URL(raw) } catch { return send(res, 400, 'Invalid image URL', 'text/plain; charset=utf-8') }
    if (target.protocol !== 'https:' || target.hostname !== 'files.catbox.moe') {
      return send(res, 403, 'Only files.catbox.moe is allowed', 'text/plain; charset=utf-8')
    }
    const proxy = (targetUrl, redirects = 0) => {
      if (targetUrl.protocol !== 'https:' || targetUrl.hostname !== 'files.catbox.moe') {
        return send(res, 403, 'Target host not allowed', 'text/plain; charset=utf-8')
      }
      https.get(targetUrl, { headers: { 'User-Agent': 'XevoBot-Dashboard/1.0' } }, upstream => {
        if ([301,302,303,307,308].includes(upstream.statusCode) && upstream.headers.location && redirects < 3) {
          upstream.resume()
          let nextUrl
          try {
            nextUrl = new URL(upstream.headers.location, targetUrl)
          } catch {
            return send(res, 400, 'Invalid redirect location', 'text/plain; charset=utf-8')
          }
          if (nextUrl.protocol !== 'https:' || nextUrl.hostname !== 'files.catbox.moe') {
            return send(res, 403, 'Redirect to unauthorized host forbidden', 'text/plain; charset=utf-8')
          }
          return proxy(nextUrl, redirects + 1)
        }
        if (upstream.statusCode !== 200) {
          upstream.resume()
          return send(res, upstream.statusCode || 502, 'Image unavailable', 'text/plain; charset=utf-8')
        }
        res.writeHead(200, {
          'Content-Type': upstream.headers['content-type'] || 'image/jpeg',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        })
        upstream.pipe(res)
      }).on('error', () => send(res, 502, 'Image proxy error', 'text/plain; charset=utf-8'))
    }
    return proxy(target)
  }

  // Profil hanya dibaca publik. Pengubahan dilakukan owner melalui config.json.
  if (req.method === 'GET' && (url.pathname === '/api/dashboard-profile' || url.pathname === '/api/dashboard-config')) {
    const profile = getDashboardConfig()
    return send(res, 200, JSON.stringify({
      success: true,
      ...profile,
      uptime: Math.floor(process.uptime()),
      sessionCount: listSessions().length
    }))
  }

  if (req.method === 'POST' && url.pathname === '/api/pairing') {
    if (!isAuthorized(req)) {
      return send(res, 401, JSON.stringify({ success: false, message: 'Unauthorized. Akses dashboard atau service token diperlukan.' }))
    }
    if (!allowed(req)) {
      return send(res, 429, JSON.stringify({ success: false, message: 'Terlalu banyak request. Tunggu sebentar lalu coba lagi.' }))
    }
    try {
      const raw = await readBody(req)
      let payload
      try { payload = JSON.parse(raw || '{}') } catch { throw new Error('Format request tidak valid.') }
      if (!payload.number || (typeof payload.number !== 'string' && typeof payload.number !== 'number')) {
        throw new Error('Nomor WhatsApp wajib diisi.')
      }
      const result = await requestPairing(payload.number)
      return send(res, 200, JSON.stringify({ success: true, code: result.code, number: result.number }))
    } catch (err) {
      console.error('❌ Pairing API:', err.message || err)
      return send(res, 400, JSON.stringify({ success: false, message: err.message || 'Pairing gagal.' }))
    }
  }

  let file = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '')
  const filePath = path.resolve(PUBLIC, file)

  if (!filePath.startsWith(PUBLIC + path.sep) && filePath !== path.join(PUBLIC, 'index.html')) {
    return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8')
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain; charset=utf-8')
    const ext = path.extname(filePath).toLowerCase()
    const types = {
      '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp'
    }
    send(res, 200, data, types[ext] || 'application/octet-stream')
  })
})

server.listen(PORT, '0.0.0.0', () => console.log(`🌐 Xevo Dashboard listening on port ${PORT}`))
