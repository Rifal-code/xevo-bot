'use strict';

const fs = require('fs');
const path = require('path');

const AUTH_ROOT = path.join(__dirname, '..', 'auth');
const AFK_FILE = path.join(AUTH_ROOT, 'afk_users.json');

const afkMap = new Map();

function loadAfk() {
  try {
    if (fs.existsSync(AFK_FILE)) {
      const raw = JSON.parse(fs.readFileSync(AFK_FILE, 'utf8'));
      if (raw && typeof raw === 'object') {
        for (const [jid, data] of Object.entries(raw)) {
          if (data && data.since) afkMap.set(jid, data);
        }
      }
    }
  } catch { }
}

function saveAfk() {
  try {
    if (!fs.existsSync(AUTH_ROOT)) fs.mkdirSync(AUTH_ROOT, { recursive: true });
    const obj = Object.fromEntries(afkMap.entries());
    fs.writeFileSync(AFK_FILE, JSON.stringify(obj, null, 2));
  } catch { }
}

function normalizeJid(jid) {
  return String(jid || '').replace(/:\d+@/, '@').split('@')[0];
}

function setAfk(jid, reason = 'Tanpa alasan') {
  const key = normalizeJid(jid);
  if (!key) return null;
  const entry = {
    jid,
    reason: String(reason || 'Tanpa alasan').trim().slice(0, 200),
    since: Date.now()
  };
  afkMap.set(key, entry);
  saveAfk();
  return entry;
}

function getAfk(jid) {
  const key = normalizeJid(jid);
  return key ? afkMap.get(key) || null : null;
}

function clearAfk(jid) {
  const key = normalizeJid(jid);
  if (!key || !afkMap.has(key)) return null;
  const entry = afkMap.get(key);
  afkMap.delete(key);
  saveAfk();
  return entry;
}

function hasAnyAfk() {
  return afkMap.size > 0;
}

function formatAfkDuration(sinceMs) {
  const diffSec = Math.max(1, Math.floor((Date.now() - sinceMs) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} jam`);
  if (m > 0) parts.push(`${m} menit`);
  if (s > 0 || parts.length === 0) parts.push(`${s} detik`);
  return parts.join(' ');
}

loadAfk();

module.exports = {
  setAfk,
  getAfk,
  clearAfk,
  hasAnyAfk,
  formatAfkDuration
};
