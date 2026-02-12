const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';

// Store active clients and their states
const clients = new Map();
const qrCodes = new Map();
const connectionStatus = new Map();

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Get or create a WhatsApp client for a session
function getOrCreateClient(sessionId) {
  if (clients.has(sessionId)) {
    return clients.get(sessionId);
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionId,
      dataPath: SESSIONS_DIR
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', async (qr) => {
    console.log(`[${sessionId}] QR code received`);
    const qrDataUrl = await QRCode.toDataURL(qr);
    qrCodes.set(sessionId, qrDataUrl);
    connectionStatus.set(sessionId, { connected: false, authenticating: true });
  });

  client.on('ready', () => {
    console.log(`[${sessionId}] Client is ready`);
    qrCodes.delete(sessionId);
    const info = client.info;
    connectionStatus.set(sessionId, {
      connected: true,
      phone: info?.wid?.user || 'unknown',
      name: info?.pushname || 'unknown'
    });
  });

  client.on('authenticated', () => {
    console.log(`[${sessionId}] Authenticated`);
  });

  client.on('auth_failure', (msg) => {
    console.error(`[${sessionId}] Auth failure:`, msg);
    connectionStatus.set(sessionId, { connected: false, error: msg });
  });

  client.on('disconnected', (reason) => {
    console.log(`[${sessionId}] Disconnected:`, reason);
    connectionStatus.set(sessionId, { connected: false, disconnected: true, reason });
    clients.delete(sessionId);
  });

  client.on('message', async (msg) => {
    console.log(`[${sessionId}] Message received:`, msg.body);
    // Here you would forward to the agent container
    // For now, just log it
  });

  clients.set(sessionId, client);
  connectionStatus.set(sessionId, { connected: false, initializing: true });

  // Initialize the client
  client.initialize().catch(err => {
    console.error(`[${sessionId}] Initialization error:`, err);
    connectionStatus.set(sessionId, { connected: false, error: err.message });
  });

  return client;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: clients.size });
});

// Get QR code for a session
app.get('/whatsapp/qr/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  // Ensure client exists
  getOrCreateClient(sessionId);

  // Wait a bit for QR to generate if needed
  await new Promise(resolve => setTimeout(resolve, 500));

  const status = connectionStatus.get(sessionId) || {};

  if (status.connected) {
    return res.json({ authenticated: true, phone: status.phone, name: status.name });
  }

  const qr = qrCodes.get(sessionId);
  if (qr) {
    return res.json({ qr, authenticated: false });
  }

  // Still initializing
  return res.status(202).json({ status: 'initializing', message: 'Please wait...' });
});

// Get status for a session
app.get('/whatsapp/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const status = connectionStatus.get(sessionId) || { connected: false };
  res.json(status);
});

// Send a message
app.post('/whatsapp/send/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing "to" or "message"' });
  }

  const client = clients.get(sessionId);
  if (!client) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const status = connectionStatus.get(sessionId);
  if (!status?.connected) {
    return res.status(400).json({ error: 'Not connected' });
  }

  try {
    // Format phone number (add @c.us suffix if needed)
    const chatId = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ success: true, to: chatId });
  } catch (error) {
    console.error(`[${sessionId}] Send error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect a session
app.post('/whatsapp/disconnect/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const client = clients.get(sessionId);

  if (client) {
    await client.destroy();
    clients.delete(sessionId);
    qrCodes.delete(sessionId);
    connectionStatus.delete(sessionId);
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`WhatsApp Bridge running on port ${PORT}`);
});
