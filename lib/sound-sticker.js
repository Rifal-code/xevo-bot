'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { execFile } = require('child_process');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const {
  proto,
  prepareWAMessageMedia,
  generateWAMessageFromContent
} = require('@whiskeysockets/baileys');

let hooksInstalled = false;

/**
 * Pasang runtime protobuf hook (tanpa menyentuh node_modules) agar:
 * - StickerMessage mendukung field 26 (audioMessage)
 */
function ensureSoundStickerProtoHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  const origStickerEncode = proto.Message.StickerMessage.encode;
  proto.Message.StickerMessage.encode = function (message, writer) {
    const w = origStickerEncode.call(this, message, writer);
    if (message && message.audioMessage) {
      // Field 26, wireType 2 (length-delimited): (26 << 3) | 2 = 210
      proto.Message.AudioMessage.encode(message.audioMessage, w.uint32(210).fork()).ldelim();
    }
    return w;
  };
}

/**
 * Jalankan promise dengan batas waktu agar tidak hang selamanya
 */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout (${Math.round(ms / 1000)}s) saat ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Ekstrak / konversi audio dari Buffer video atau audio ke OGG Opus (maks 10 detik)
 */
async function extractAudioOgg(inputBuffer, ext = 'mp4') {
  const ffmpegBin = (ffmpegInstaller && ffmpegInstaller.path) || 'ffmpeg';
  const tmpIn = path.join(os.tmpdir(), `xevo_snd_in_${randomUUID()}.${ext}`);
  const tmpOut = path.join(os.tmpdir(), `xevo_snd_out_${randomUUID()}.ogg`);

  await fs.promises.writeFile(tmpIn, inputBuffer);

  return new Promise((resolve, reject) => {
    execFile(ffmpegBin, [
      '-y',
      '-i', tmpIn,
      '-t', '10',
      '-vn',
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-ac', '1',
      '-ar', '48000',
      '-avoid_negative_ts', 'make_zero',
      tmpOut
    ], { timeout: 30000 }, async (err) => {
      try { await fs.promises.unlink(tmpIn); } catch { }
      if (err) {
        try { await fs.promises.unlink(tmpOut); } catch { }
        return reject(new Error('Video/file tidak memiliki track audio atau gagal dikonversi ke OGG Opus.'));
      }
      try {
        const outBuf = await fs.promises.readFile(tmpOut);
        await fs.promises.unlink(tmpOut);
        if (!outBuf || outBuf.length < 200) {
          return reject(new Error('Track audio kosong.'));
        }
        resolve(outBuf);
      } catch (readErr) {
        reject(readErr);
      }
    });
  });
}

/**
 * Upload WebP sticker + OGG audio ke server WhatsApp lalu kirim dengan payload sound sticker (v1)
 */
async function sendSoundSticker(conn, jid, webpBuffer, oggBuffer, { quoted } = {}) {
  ensureSoundStickerProtoHooks();

  console.log(`🔊 [ssound] Mengunggah media (webp=${webpBuffer.length}B, ogg=${oggBuffer.length}B)...`);
  const [stickerMedia, audioMedia] = await withTimeout(
    Promise.all([
      prepareWAMessageMedia(
        { sticker: webpBuffer },
        { upload: conn.waUploadToServer }
      ),
      prepareWAMessageMedia(
        { audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: false },
        { upload: conn.waUploadToServer }
      )
    ]),
    35000,
    'mengunggah stiker & audio ke WhatsApp'
  );

  const stickerMsg = stickerMedia.stickerMessage;
  const audioMsg = audioMedia.audioMessage;

  if (!stickerMsg || !audioMsg) {
    throw new Error('Gagal mengunggah stiker atau audio ke server WhatsApp.');
  }

  const baseContent = generateWAMessageFromContent(
    jid,
    { stickerMessage: stickerMsg },
    { userJid: conn.user?.id, quoted }
  );

  // StickerMessage.audioMessage (field 26)
  baseContent.message.stickerMessage.audioMessage = audioMsg;

  console.log(`🔊 [ssound] Mengirim relayMessage (id=${baseContent.key.id})...`);
  await withTimeout(
    conn.relayMessage(jid, baseContent.message, { messageId: baseContent.key.id }),
    25000,
    'mengirim stiker bersuara'
  );
  console.log('✅ [ssound] Sound sticker terkirim');
  return baseContent;
}

module.exports = {
  ensureSoundStickerProtoHooks,
  extractAudioOgg,
  sendSoundSticker,
  withTimeout
};
