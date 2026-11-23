'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'groups.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, '{}', 'utf8');
      return {};
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error('❌ Gagal membaca groups.json:', err);
    return {};
  }
}

function writeDb(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Gagal menulis groups.json:', err);
  }
}

function getGroupConfig(groupId) {
  if (!groupId) return {};
  const db = readDb();
  return db[groupId] || {};
}

function setGroupConfig(groupId, updates) {
  if (!groupId) return {};
  const db = readDb();
  const current = db[groupId] || {};
  db[groupId] = {
    ...current,
    ...updates,
    updatedAt: Date.now()
  };
  writeDb(db);
  return db[groupId];
}

function isAntilinkEnabled(groupId) {
  if (!groupId) return false;
  const cfg = getGroupConfig(groupId);
  return !!cfg.antilink;
}

module.exports = {
  getGroupConfig,
  setGroupConfig,
  isAntilinkEnabled
};
