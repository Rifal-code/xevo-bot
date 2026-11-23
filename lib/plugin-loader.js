'use strict';

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
const commands = new Map();
const aliases = new Map();
const plugins = [];

/**
 * Scan folder plugins secara rekursif
 */
function scanPlugins(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(scanPlugins(fullPath));
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Load seluruh plugin ke dalam memory
 */
function loadPlugins() {
  commands.clear();
  aliases.clear();
  plugins.length = 0;

  const files = scanPlugins(PLUGINS_DIR);
  for (const file of files) {
    try {
      delete require.cache[require.resolve(file)];
      const plugin = require(file);

      if (!plugin.name || typeof plugin.run !== 'function') {
        console.warn(`⚠️ [PluginLoader] Plugin tidak valid dilewati: ${file}`);
        continue;
      }

      commands.set(plugin.name.toLowerCase(), plugin);
      plugins.push(plugin);

      if (Array.isArray(plugin.aliases)) {
        for (const alias of plugin.aliases) {
          aliases.set(alias.toLowerCase(), plugin);
        }
      }
    } catch (err) {
      console.error(`❌ [PluginLoader] Gagal memuat plugin ${file}:`, err?.message || err);
    }
  }

  console.log(`🔌 [PluginLoader] Berhasil memuat ${plugins.length} plugin bot.`);
}

/**
 * Tangani eksekusi perintah jika cocok dengan salah satu plugin
 */
async function handlePluginCommand(ctx) {
  const { command, reply } = ctx;
  const targetPlugin = commands.get(command) || aliases.get(command);

  if (!targetPlugin) return false;

  try {
    await targetPlugin.run(ctx);
    return true;
  } catch (err) {
    console.error(`❌ Error pada plugin [${targetPlugin.name}]:`, err);
    try {
      await reply(`⚠️ Terjadi kesalahan saat menjalankan fitur *${targetPlugin.name}*:\n_${err?.message || 'Unknown error'}_`);
    } catch {}
    return true;
  }
}

/**
 * Ambil daftar plugin yang dikelompokkan berdasarkan kategori untuk menu bot
 */
function getMenuByCategory() {
  const categories = {};
  for (const p of plugins) {
    const cat = (p.category || 'tools').toUpperCase();
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({
      name: p.name,
      description: p.description || '',
      usage: p.usage || `.${p.name}`
    });
  }
  return categories;
}

// Inisialisasi saat pertama kali require
loadPlugins();

module.exports = {
  loadPlugins,
  handlePluginCommand,
  getMenuByCategory,
  commands,
  aliases,
  plugins
};
