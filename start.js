'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const BINARY = path.join(ROOT, 'cloudflared');
const PORT = process.env.PORT || '5004';
const LOCAL_CONFIG = path.join(ROOT, 'config.local.json');

function log(msg) {
  console.log(`[Xevo] ${msg}`);
}

function cloudflaredAsset() {
  const arch = process.arch;
  const platform = process.platform;
  if (platform === 'win32') {
    if (arch === 'x64') return 'cloudflared-windows-amd64.exe';
    throw new Error(`Arsitektur Windows tidak didukung: ${arch}`);
  }
  if (arch === 'x64') return 'cloudflared-linux-amd64';
  if (arch === 'arm64') return 'cloudflared-linux-arm64';
  if (arch === 'arm') return 'cloudflared-linux-arm';
  throw new Error(`Arsitektur Node tidak didukung: ${arch}`);
}

async function downloadCloudflared() {
  const asset = cloudflaredAsset();
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`;

  log(`cloudflared belum ada. Mengunduh ${asset}...`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Gagal mengunduh cloudflared (HTTP ${res.status})`);
  }

  const tmp = `${BINARY}.tmp`;
  const file = fs.createWriteStream(tmp);
  const reader = res.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!file.write(Buffer.from(value))) {
        await new Promise(resolve => file.once('drain', resolve));
      }
    }
  } finally {
    file.end();
    await new Promise(resolve => file.once('close', resolve));
  }

  fs.renameSync(tmp, BINARY);
  fs.chmodSync(BINARY, 0o755);
  log('cloudflared berhasil disiapkan.');
}


async function ensureCloudflared() {
  if (!fs.existsSync(BINARY)) await downloadCloudflared();
  else fs.chmodSync(BINARY, 0o755);
}


function startProcess(command, args, name) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', data => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', data => process.stderr.write(`[${name}] ${data}`));
  child.on('exit', (code, signal) => {
    log(`${name} berhenti (code=${code}, signal=${signal || 'none'}).`);
    if (name === 'Server') process.exit(code ?? 1);
  });
  child.on('error', err => log(`${name} error: ${err.message}`));
  return child;
}

let serverProcess;
let tunnelProcess;

async function main() {
  log(`Node platform: ${process.platform}, architecture: ${process.arch}`);
  serverProcess = startProcess(process.execPath, ['server.js'], 'Server');

  if (process.env.ENABLE_TUNNEL === 'true') {
    // Beri server sedikit waktu untuk bind ke port sebelum tunnel dimulai.
    await new Promise(resolve => setTimeout(resolve, 2500));
    await ensureCloudflared();

    log(`Membuat Quick Tunnel ke http://127.0.0.1:${PORT} ...`);
    tunnelProcess = startProcess(BINARY, ['tunnel', '--url', `http://127.0.0.1:${PORT}`], 'Cloudflare');
  } else {
    log(`Standalone mode: Cloudflare tunnel tidak diaktifkan (set ENABLE_TUNNEL=true untuk mengaktifkan).`);
  }
}

function shutdown() {
  if (tunnelProcess && !tunnelProcess.killed) tunnelProcess.kill('SIGTERM');
  if (serverProcess && !serverProcess.killed) serverProcess.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch(err => {
  console.error(`[Xevo] Gagal menjalankan startup: ${err.message}`);
  shutdown();
  process.exit(1);
});
