'use strict';

const axios = require('axios');

const SYSTEM_PROMPT =
  'Kamu adalah asisten AI bot WhatsApp bernama PECADO AI. Jawab dalam Bahasa Indonesia yang santai, jelas, akurat, dan ringkas. Jika kamu tidak yakin terhadap fakta, alamat, atau nomor telepon tertentu, katakan dengan jujur dan jangan mengarang.';

async function askGemini(prompt) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await axios.post(url, {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }]
  }, { timeout: 30000 });

  const parts = res.data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('').trim();
  return text || null;
}

async function askGroq(prompt) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) return null;

  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5
  }, {
    timeout: 30000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const text = res.data?.choices?.[0]?.message?.content?.trim();
  return text || null;
}

async function askPollinations(prompt) {
  const res = await axios.post('https://text.pollinations.ai/', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    model: 'openai',
    private: true
  }, { timeout: 30000 });

  const text = typeof res.data === 'string' ? res.data.trim() : JSON.stringify(res.data);
  return text || null;
}

async function fetchImageBuffer(url, timeout = 35000) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const ctype = String(res.headers['content-type'] || '');
  const buf = Buffer.from(res.data);
  if (!ctype.startsWith('image/') || buf.length < 1000) {
    throw new Error(`Respons bukan gambar (${ctype || 'unknown'})`);
  }
  return buf;
}

async function generateImageGemini(prompt) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: `Generate an image: ${prompt}` }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  }, { timeout: 45000 });

  const parts = res.data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData?.data);
  if (!imgPart) return null;
  return Buffer.from(imgPart.inlineData.data, 'base64');
}

module.exports = [
  {
    name: 'ai',
    aliases: ['gpt', 'tanya', 'gemini'],
    category: 'tools',
    description: 'Tanya jawab dengan PECADO AI dalam Bahasa Indonesia.',
    usage: '.ai <pertanyaan>',

    run: async ({ text, reply }) => {
      const prompt = (text || '').trim();
      if (!prompt) {
        return reply('⚠️ Masukkan pertanyaan!\n\nContoh: `.ai jelaskan cara kerja internet dengan singkat`');
      }

      await reply('🤖 Sedang berpikir...');

      try {
        let answer = null;
        let lastErr = null;

        for (const engine of [askGemini, askGroq, askPollinations]) {
          try {
            answer = await engine(prompt);
            if (answer) break;
          } catch (err) {
            lastErr = err;
            console.warn(`⚠️ [PECADO AI] Engine ${engine.name} gagal:`, err?.response?.data?.error?.message || err.message);
          }
        }

        if (!answer) {
          throw new Error(lastErr?.message || 'Semua engine AI tidak memberikan jawaban.');
        }

        return reply(`🤖 *PECADO AI*\n\n${answer.slice(0, 3500)}`);
      } catch (err) {
        console.error('❌ ai error:', err);
        return reply(`❌ Gagal menghubungi AI: ${err.message}`);
      }
    }
  },

  {
    name: 'aiimg',
    aliases: ['aiimage', 'imagine', 'buatgambar'],
    category: 'tools',
    description: 'Buat gambar AI dari deskripsi teks (gratis, multi-engine).',
    usage: '.aiimg <deskripsi gambar>',

    run: async ({ conn, m, text, reply }) => {
      const prompt = (text || '').trim();
      if (!prompt) {
        return reply('⚠️ Masukkan deskripsi gambar!\n\nContoh: `.aiimg kucing oren pakai kacamata hitam cyberpunk`');
      }

      await reply('🎨 Sedang melukis gambar AI, mohon tunggu...');

      const seed = Math.floor(Math.random() * 999999);
      const encoded = encodeURIComponent(prompt);
      const engines = [
        { name: 'Gemini Image', fn: () => generateImageGemini(prompt) },
        { name: 'Pollinations Turbo', fn: () => fetchImageBuffer(`https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=turbo&seed=${seed}`) },
        { name: 'Pollinations Flux', fn: () => fetchImageBuffer(`https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`) },
        { name: 'Hercai', fn: () => fetchImageBuffer(`https://hercai.onrender.com/v3/text2image?prompt=${encoded}`) }
      ];

      let buf = null;
      let usedEngine = '';
      let lastErr = null;

      for (const eng of engines) {
        try {
          const resBuf = await eng.fn();
          if (resBuf && resBuf.length > 1000) {
            buf = resBuf;
            usedEngine = eng.name;
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn(`⚠️ [PECADO AI Image] ${eng.name} gagal:`, err.message);
        }
      }

      if (!buf) {
        return reply(`❌ Gagal membuat gambar AI (semua server sedang sibuk): ${lastErr?.message || 'Unknown error'}`);
      }

      await conn.sendMessage(m.chat, {
        image: buf,
        caption: `🎨 *PECADO AI Image* (${usedEngine})\n📝 Prompt: _${prompt}_`
      }, { quoted: m });
    }
  }
];
