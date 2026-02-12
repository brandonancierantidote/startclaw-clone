#!/bin/bash
# Deploy WhatsApp bridge to Hetzner server
# Run this script on the server: bash deploy.sh

set -e

echo "=== The One - WhatsApp Bridge Deployment ==="

# Create directories
mkdir -p /opt/theone/whatsapp-bridge
mkdir -p /opt/theone/whatsapp-sessions

# Navigate to bridge directory
cd /opt/theone/whatsapp-bridge

# Write package.json
cat > package.json << 'PKGJSON'
{
  "name": "whatsapp-bridge",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "whatsapp-web.js": "^1.25.0",
    "express": "^4.18.2",
    "qrcode": "^1.5.3",
    "cors": "^2.8.5"
  }
}
PKGJSON

# Write index.js
cat > index.js << 'INDEXJS'
const { Client, LocalAuth } = require("whatsapp-web.js");
const express = require("express");
const qrcode = require("qrcode");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const sessions = new Map();

function getOrCreateClient(sessionId) {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    }
  });

  const sessionData = { client, qr: null, ready: false, phone: null };
  sessions.set(sessionId, sessionData);

  client.on("qr", async (qr) => {
    sessionData.qr = await qrcode.toDataURL(qr);
    console.log(`QR generated for session ${sessionId}`);
  });

  client.on("ready", async () => {
    sessionData.ready = true;
    sessionData.qr = null;
    const info = client.info;
    sessionData.phone = info?.wid?.user || "unknown";
    console.log(`Client ready for session ${sessionId}: ${sessionData.phone}`);
  });

  client.on("disconnected", () => {
    sessionData.ready = false;
    console.log(`Client disconnected for session ${sessionId}`);
  });

  client.initialize();
  return sessionData;
}

app.get("/health", (req, res) => res.json({ status: "ok", sessions: sessions.size }));

app.get("/whatsapp/qr/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = getOrCreateClient(sessionId);

  if (session.ready) {
    return res.json({ authenticated: true, phone: session.phone });
  }
  if (session.qr) {
    return res.json({ qr: session.qr, authenticated: false });
  }
  res.status(202).json({ status: "initializing" });
});

app.get("/whatsapp/status/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  if (!sessions.has(sessionId)) {
    return res.json({ connected: false });
  }
  const session = sessions.get(sessionId);
  res.json({ connected: session.ready, phone: session.phone });
});

app.post("/whatsapp/send/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { to, message } = req.body;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const session = sessions.get(sessionId);
  if (!session.ready) {
    return res.status(400).json({ error: "Client not ready" });
  }

  try {
    const chatId = to.includes("@") ? to : `${to}@c.us`;
    await session.client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => console.log(`WhatsApp bridge running on port ${PORT}`));
INDEXJS

# Write Dockerfile
cat > Dockerfile << 'DOCKERFILE'
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    libgbm-dev \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libdrm2 \
    libxshmfence1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package.json .
RUN npm install
COPY index.js .
EXPOSE 3001
CMD ["node", "index.js"]
DOCKERFILE

echo "Building Docker image..."
docker build -t theone/whatsapp-bridge:latest .

echo "Stopping existing container if any..."
docker stop whatsapp-bridge 2>/dev/null || true
docker rm whatsapp-bridge 2>/dev/null || true

echo "Starting WhatsApp bridge..."
docker run -d \
  --name whatsapp-bridge \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/theone/whatsapp-sessions:/app/.wwebjs_auth \
  theone/whatsapp-bridge:latest

echo "Waiting for bridge to start..."
sleep 5

echo "Checking health..."
curl -s http://localhost:3001/health || echo "Health check failed"

echo ""
echo "=== Deployment complete! ==="
echo "WhatsApp bridge is running on port 3001"
echo "Test: curl http://localhost:3001/health"
