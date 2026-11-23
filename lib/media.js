'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const webpmux = require('node-webpmux');
const QRCode = require('qrcode');

if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

/**
 * Download media stream dari pesan Baileys menjadi Buffer
 */
async function downloadMedia(message, type) {
  if (!message) return null;
  const stream = await downloadContentFromMessage(message, type);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

/**
 * Konversi Buffer Gambar/Video ke WebP Sticker
 */
async function imageToWebp(inputBuffer, isVideo = false) {
  const tmpIn = path.join(os.tmpdir(), `xevo_in_${randomUUID()}.${isVideo ? 'mp4' : 'jpg'}`);
  const tmpOut = path.join(os.tmpdir(), `xevo_out_${randomUUID()}.webp`);

  await fs.promises.writeFile(tmpIn, inputBuffer);

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(tmpIn)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-vf', "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
        '-lossless', '0',
        '-compression_level', '4',
        '-q:v', '70',
        '-loop', '0',
        '-preset', 'default',
        '-an',
        '-vsync', '0',
        '-s', '512x512'
      ]);

    if (!isVideo) {
      cmd = ffmpeg(tmpIn)
        .outputOptions([
          '-vcodec', 'libwebp',
          '-vf', "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0",
          '-lossless', '0',
          '-compression_level', '4',
          '-q:v', '75',
          '-preset', 'picture'
        ]);
    }

    cmd
      .toFormat('webp')
      .on('error', async (err) => {
        try { await fs.promises.unlink(tmpIn); } catch {}
        try { await fs.promises.unlink(tmpOut); } catch {}
        reject(err);
      })
      .on('end', async () => {
        try {
          const outBuffer = await fs.promises.readFile(tmpOut);
          await fs.promises.unlink(tmpIn);
          await fs.promises.unlink(tmpOut);
          resolve(outBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .save(tmpOut);
  });
}

/**
 * Menyuntikkan Metadata EXIF (Packname & Author) ke Sticker WebP
 */
async function addExif(webpBuffer, packname = 'PECADO BOT', author = 'Xevo Engine') {
  const img = new webpmux.Image();
  await img.load(webpBuffer);

  const json = {
    'sticker-pack-id': randomUUID(),
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': ['⚡', '🤖']
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  img.exif = exif;
  return await img.save(null);
}

/**
 * Konversi WebP Sticker ke format JPEG gambar biasa
 */
async function webpToImage(webpBuffer) {
  const tmpIn = path.join(os.tmpdir(), `xevo_webp_${randomUUID()}.webp`);
  const tmpOut = path.join(os.tmpdir(), `xevo_img_${randomUUID()}.jpg`);

  await fs.promises.writeFile(tmpIn, webpBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .toFormat('image2')
      .outputOptions(['-vcodec', 'mjpeg', '-q:v', '2'])
      .on('error', async (err) => {
        try { await fs.promises.unlink(tmpIn); } catch {}
        try { await fs.promises.unlink(tmpOut); } catch {}
        reject(err);
      })
      .on('end', async () => {
        try {
          const outBuffer = await fs.promises.readFile(tmpOut);
          await fs.promises.unlink(tmpIn);
          await fs.promises.unlink(tmpOut);
          resolve(outBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .save(tmpOut);
  });
}

/**
 * Text-to-Speech via Google Translate TTS
 */
async function textToSpeech(text, lang = 'id') {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`Google TTS gagal dengan status ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate QR Code Buffer (PNG)
 */
async function generateQr(text) {
  return await QRCode.toBuffer(String(text), {
    width: 512,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

module.exports = {
  downloadMedia,
  imageToWebp,
  addExif,
  webpToImage,
  textToSpeech,
  generateQr
};
