FROM node:20-bullseye-slim

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
RUN npm install

# Copy application source
COPY . .

# Ensure bin directory symlink for yt-dlp
RUN mkdir -p /app/bin && ln -sf /usr/local/bin/yt-dlp /app/bin/yt-dlp

ENV PORT=5004
EXPOSE 5004

CMD ["node", "server.js"]
