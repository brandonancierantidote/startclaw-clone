#!/usr/bin/env python3
"""
The One - Orchestrator API
Handles provisioning and management of OpenClaw agent containers
"""

import os
import json
import uuid
import secrets
from datetime import datetime
from functools import wraps

import docker
import redis
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configuration
LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://litellm:4000")
LITELLM_MASTER_KEY = os.environ.get("LITELLM_MASTER_KEY", "sk-theone-master-2026")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379")
API_SECRET = os.environ.get("API_SECRET", "theone-orchestrator-secret-2026")
AGENTS_DIR = "/opt/theone/agents"

# Initialize Docker client
docker_client = docker.from_env()

# Initialize Redis
redis_client = redis.from_url(REDIS_URL)


def require_auth(f):
    """Decorator to require API authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or auth_header != f"Bearer {API_SECRET}":
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "docker": "connected",
            "redis": "connected" if redis_client.ping() else "disconnected"
        }
    })


@app.route("/api/virtual-keys", methods=["POST"])
@require_auth
def create_virtual_key():
    """
    Create a LiteLLM virtual key for a user
    Used for per-user rate limiting and cost tracking
    """
    data = request.json
    user_id = data.get("user_id")
    max_budget = data.get("max_budget", 25.0)  # Default $25

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        # Create virtual key via LiteLLM API
        response = requests.post(
            f"{LITELLM_BASE_URL}/key/generate",
            headers={"Authorization": f"Bearer {LITELLM_MASTER_KEY}"},
            json={
                "user_id": user_id,
                "max_budget": max_budget,
                "budget_duration": "monthly",
                "models": ["agent-primary", "agent-light", "claude-sonnet-4-5-20250514"],
                "metadata": {
                    "created_by": "theone-orchestrator",
                    "created_at": datetime.utcnow().isoformat()
                }
            }
        )

        if response.status_code == 200:
            key_data = response.json()
            return jsonify({
                "success": True,
                "virtual_key": key_data.get("key"),
                "user_id": user_id,
                "max_budget": max_budget
            })
        else:
            return jsonify({
                "error": "Failed to create virtual key",
                "details": response.text
            }), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/agents/provision", methods=["POST"])
@require_auth
def provision_agent():
    """
    Provision a new OpenClaw agent container for a user
    """
    data = request.json
    agent_id = data.get("agent_id") or str(uuid.uuid4())
    user_id = data.get("user_id")
    soul_md = data.get("soul_md", "")
    virtual_key = data.get("virtual_key")
    display_name = data.get("display_name", "My Agent")

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    container_name = f"agent_{agent_id[:8]}"
    network_name = f"agent_net_{agent_id[:8]}"

    try:
        # Create isolated network for this agent
        try:
            network = docker_client.networks.create(
                network_name,
                driver="bridge",
                internal=False  # Allow outbound for API calls
            )
        except docker.errors.APIError as e:
            if "already exists" in str(e):
                network = docker_client.networks.get(network_name)
            else:
                raise

        # Create agent directory and write SOUL.md
        agent_dir = os.path.join(AGENTS_DIR, agent_id)
        os.makedirs(agent_dir, exist_ok=True)

        soul_path = os.path.join(agent_dir, "SOUL.md")
        with open(soul_path, "w") as f:
            f.write(soul_md)

        # Create config for agent
        config = {
            "agent_id": agent_id,
            "user_id": user_id,
            "display_name": display_name,
            "litellm_base_url": LITELLM_BASE_URL,
            "created_at": datetime.utcnow().isoformat()
        }

        config_path = os.path.join(agent_dir, "config.json")
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

        # For now, create a simple container that can be used for testing
        # In production, this would run the actual OpenClaw image
        container = docker_client.containers.run(
            "python:3.12-slim",  # Placeholder - replace with openclaw image
            name=container_name,
            detach=True,
            environment={
                "AGENT_ID": agent_id,
                "USER_ID": user_id,
                "LITELLM_BASE_URL": LITELLM_BASE_URL,
                "LITELLM_API_KEY": virtual_key or LITELLM_MASTER_KEY,
                "ANTHROPIC_API_KEY": virtual_key or "",  # OpenClaw uses this
            },
            volumes={
                agent_dir: {"bind": "/agent", "mode": "rw"}
            },
            network=network_name,
            command="sleep infinity",  # Keep container running
            restart_policy={"Name": "unless-stopped"}
        )

        # Connect to theone-network so it can reach LiteLLM
        theone_network = docker_client.networks.get("theone_theone-network")
        theone_network.connect(container)

        # Store agent info in Redis
        redis_client.hset(f"agent:{agent_id}", mapping={
            "container_id": container.id,
            "container_name": container_name,
            "network_name": network_name,
            "user_id": user_id,
            "status": "running",
            "created_at": datetime.utcnow().isoformat()
        })

        return jsonify({
            "success": True,
            "agent_id": agent_id,
            "container_id": container.id,
            "container_name": container_name,
            "status": "running"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/agents/<agent_id>/deprovision", methods=["POST"])
@require_auth
def deprovision_agent(agent_id):
    """
    Deprovision an agent container
    """
    try:
        # Get agent info from Redis
        agent_info = redis_client.hgetall(f"agent:{agent_id}")

        if not agent_info:
            return jsonify({"error": "Agent not found"}), 404

        container_name = agent_info.get(b"container_name", b"").decode()
        network_name = agent_info.get(b"network_name", b"").decode()

        # Stop and remove container
        try:
            container = docker_client.containers.get(container_name)
            container.stop(timeout=10)
            container.remove()
        except docker.errors.NotFound:
            pass

        # Remove network
        try:
            network = docker_client.networks.get(network_name)
            network.remove()
        except docker.errors.NotFound:
            pass

        # Update Redis
        redis_client.hset(f"agent:{agent_id}", "status", "stopped")

        return jsonify({
            "success": True,
            "agent_id": agent_id,
            "status": "deprovisioned"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/agents/<agent_id>/pause", methods=["POST"])
@require_auth
def pause_agent(agent_id):
    """Pause an agent container"""
    try:
        agent_info = redis_client.hgetall(f"agent:{agent_id}")
        if not agent_info:
            return jsonify({"error": "Agent not found"}), 404

        container_name = agent_info.get(b"container_name", b"").decode()
        container = docker_client.containers.get(container_name)
        container.pause()

        redis_client.hset(f"agent:{agent_id}", "status", "paused")

        return jsonify({"success": True, "status": "paused"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/agents/<agent_id>/resume", methods=["POST"])
@require_auth
def resume_agent(agent_id):
    """Resume a paused agent container"""
    try:
        agent_info = redis_client.hgetall(f"agent:{agent_id}")
        if not agent_info:
            return jsonify({"error": "Agent not found"}), 404

        container_name = agent_info.get(b"container_name", b"").decode()
        container = docker_client.containers.get(container_name)
        container.unpause()

        redis_client.hset(f"agent:{agent_id}", "status", "running")

        return jsonify({"success": True, "status": "running"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/agents/<agent_id>/status", methods=["GET"])
@require_auth
def get_agent_status(agent_id):
    """Get agent container status"""
    try:
        agent_info = redis_client.hgetall(f"agent:{agent_id}")
        if not agent_info:
            return jsonify({"error": "Agent not found"}), 404

        container_name = agent_info.get(b"container_name", b"").decode()

        try:
            container = docker_client.containers.get(container_name)
            container_status = container.status
        except docker.errors.NotFound:
            container_status = "not_found"

        return jsonify({
            "agent_id": agent_id,
            "container_status": container_status,
            "redis_status": agent_info.get(b"status", b"unknown").decode(),
            "user_id": agent_info.get(b"user_id", b"").decode(),
            "created_at": agent_info.get(b"created_at", b"").decode()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/credits/check", methods=["POST"])
@require_auth
def check_credits():
    """
    Check if user has sufficient credits before an API call
    Used by LiteLLM as a pre-call hook
    """
    data = request.json
    user_id = data.get("user_id")
    estimated_cost = data.get("estimated_cost", 0.01)  # Default 1 cent

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    # Get balance from Redis cache
    balance_key = f"credits:{user_id}"
    balance = redis_client.get(balance_key)

    if balance is None:
        # If not in cache, assume they have credits (will be verified by main DB)
        return jsonify({"allowed": True, "balance": "unknown"})

    balance_cents = int(balance)
    estimated_cents = int(estimated_cost * 100)

    if balance_cents < estimated_cents:
        return jsonify({
            "allowed": False,
            "balance_cents": balance_cents,
            "estimated_cents": estimated_cents,
            "message": "Insufficient credits"
        })

    return jsonify({
        "allowed": True,
        "balance_cents": balance_cents,
        "estimated_cents": estimated_cents
    })


@app.route("/api/credits/deduct", methods=["POST"])
@require_auth
def deduct_credits():
    """
    Deduct credits after an API call completes
    Called by LiteLLM callback
    """
    data = request.json
    user_id = data.get("user_id")
    cost_cents = data.get("cost_cents", 0)

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    balance_key = f"credits:{user_id}"

    # Atomic decrement
    new_balance = redis_client.decrby(balance_key, cost_cents)

    return jsonify({
        "success": True,
        "new_balance_cents": new_balance,
        "deducted_cents": cost_cents
    })


@app.route("/api/credits/set", methods=["POST"])
@require_auth
def set_credits():
    """
    Set credit balance for a user (used to sync from main DB)
    """
    data = request.json
    user_id = data.get("user_id")
    balance_cents = data.get("balance_cents", 0)

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    balance_key = f"credits:{user_id}"
    redis_client.set(balance_key, balance_cents)

    return jsonify({
        "success": True,
        "user_id": user_id,
        "balance_cents": balance_cents
    })


@app.route("/api/rate-limit/check", methods=["POST"])
@require_auth
def check_rate_limit():
    """
    Check hourly rate limit (200K tokens per hour per user)
    """
    data = request.json
    user_id = data.get("user_id")
    tokens = data.get("tokens", 0)

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    # Sliding window rate limit key
    rate_key = f"rate:{user_id}:hourly"
    current = redis_client.get(rate_key)
    current_tokens = int(current) if current else 0

    HOURLY_LIMIT = 200000  # 200K tokens per hour

    if current_tokens + tokens > HOURLY_LIMIT:
        return jsonify({
            "allowed": False,
            "current_tokens": current_tokens,
            "requested_tokens": tokens,
            "limit": HOURLY_LIMIT,
            "message": "Rate limit exceeded. Please wait."
        })

    # Increment counter with 1 hour TTL
    pipe = redis_client.pipeline()
    pipe.incrby(rate_key, tokens)
    pipe.expire(rate_key, 3600)  # 1 hour
    pipe.execute()

    return jsonify({
        "allowed": True,
        "current_tokens": current_tokens + tokens,
        "limit": HOURLY_LIMIT
    })


@app.route("/api/test-litellm", methods=["POST"])
@require_auth
def test_litellm():
    """
    Test LiteLLM connectivity and API functionality
    """
    data = request.json or {}
    message = data.get("message", "Hello! Please respond with a brief greeting.")
    model = data.get("model", "agent-primary")

    try:
        response = requests.post(
            f"{LITELLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": message}],
                "max_tokens": 150
            },
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            return jsonify({
                "success": True,
                "model": model,
                "response": result.get("choices", [{}])[0].get("message", {}).get("content", ""),
                "usage": result.get("usage", {})
            })
        else:
            return jsonify({
                "success": False,
                "status_code": response.status_code,
                "error": response.text
            }), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/services/whatsapp-bridge/deploy", methods=["POST"])
@require_auth
def deploy_whatsapp_bridge():
    """
    Deploy the WhatsApp bridge service
    This builds and runs the whatsapp-web.js bridge container
    """
    container_name = "whatsapp-bridge"

    try:
        # Check if container already exists
        try:
            existing = docker_client.containers.get(container_name)
            if existing.status == "running":
                return jsonify({
                    "success": True,
                    "message": "WhatsApp bridge already running",
                    "container_id": existing.id,
                    "status": existing.status
                })
            else:
                # Remove stopped container
                existing.remove()
        except docker.errors.NotFound:
            pass

        # Build the image from the Dockerfile
        whatsapp_dir = "/opt/theone/whatsapp-bridge"

        # Check if directory exists, if not create minimal setup
        if not os.path.exists(whatsapp_dir):
            os.makedirs(whatsapp_dir, exist_ok=True)

            # Write package.json
            package_json = {
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
            with open(os.path.join(whatsapp_dir, "package.json"), "w") as f:
                json.dump(package_json, f, indent=2)

            # Write index.js
            index_js = '''const { Client, LocalAuth } = require("whatsapp-web.js");
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
'''
            with open(os.path.join(whatsapp_dir, "index.js"), "w") as f:
                f.write(index_js)

            # Write Dockerfile
            dockerfile = '''FROM node:20-slim
RUN apt-get update && apt-get install -y \\
    chromium \\
    libgbm-dev \\
    libnss3 \\
    libatk-bridge2.0-0 \\
    libx11-xcb1 \\
    libxcb-dri3-0 \\
    libdrm2 \\
    libxshmfence1 \\
    libxrandr2 \\
    libasound2 \\
    libpangocairo-1.0-0 \\
    libgtk-3-0 \\
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package.json .
RUN npm install
COPY index.js .
EXPOSE 3001
CMD ["node", "index.js"]
'''
            with open(os.path.join(whatsapp_dir, "Dockerfile"), "w") as f:
                f.write(dockerfile)

        # Build the Docker image
        image, build_logs = docker_client.images.build(
            path=whatsapp_dir,
            tag="theone/whatsapp-bridge:latest",
            rm=True
        )

        # Run the container
        container = docker_client.containers.run(
            "theone/whatsapp-bridge:latest",
            name=container_name,
            detach=True,
            ports={"3001/tcp": 3001},
            volumes={
                "/opt/theone/whatsapp-sessions": {"bind": "/app/.wwebjs_auth", "mode": "rw"}
            },
            restart_policy={"Name": "unless-stopped"},
            environment={
                "PORT": "3001"
            }
        )

        # Connect to theone network
        try:
            theone_network = docker_client.networks.get("theone_theone-network")
            theone_network.connect(container)
        except Exception:
            pass  # Network might not exist yet

        return jsonify({
            "success": True,
            "message": "WhatsApp bridge deployed successfully",
            "container_id": container.id,
            "container_name": container_name,
            "port": 3001
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/services/whatsapp-bridge/status", methods=["GET"])
def whatsapp_bridge_status():
    """Check WhatsApp bridge service status"""
    try:
        container = docker_client.containers.get("whatsapp-bridge")
        return jsonify({
            "running": container.status == "running",
            "status": container.status,
            "container_id": container.id
        })
    except docker.errors.NotFound:
        return jsonify({"running": False, "status": "not_deployed"})
    except Exception as e:
        return jsonify({"running": False, "error": str(e)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
