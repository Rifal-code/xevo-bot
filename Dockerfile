FROM node:20-bookworm-slim

# Install system dependencies (python3, ffmpeg, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install standalone yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy dependency definitions and install
COPY package*.json ./
RUN npm install --ignore-scripts

# Copy application source
COPY . .

# Apply Baileys 6.7.24 patches (8-char pairing-code fix) — see scripts/patch-baileys.js
RUN node scripts/patch-baileys.js

# Ensure bin directory symlink for yt-dlp
RUN mkdir -p /app/bin && ln -sf /usr/local/bin/yt-dlp /app/bin/yt-dlp

# Build verification
RUN node -e "console.log('🚀 [DOCKER BUILD CHECK]: Build verified at ' + new Date().toISOString() + ' | ytdl-lite: ' + (typeof require('ytdl-lite').ytmp4 === 'function'))"

ENV PORT=5004
EXPOSE 5004

CMD ["node", "server.js"]
