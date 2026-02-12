#!/bin/bash
# Test script for The One APIs
# Run: bash scripts/test-apis.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://46.225.107.94:5000}"
LITELLM_URL="${LITELLM_URL:-http://46.225.107.94:4000}"
ORCH_SECRET="${ORCH_SECRET:-theone-orchestrator-secret-2026}"

echo "=== The One API Test Suite ==="
echo "Base URL: $BASE_URL"
echo "Orchestrator: $ORCHESTRATOR_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; }

# Test 1: Templates API
echo "--- Public APIs ---"
result=$(curl -s "$BASE_URL/api/templates" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
if [ "$result" -gt 0 ] 2>/dev/null; then
    pass "Templates API returns $result templates"
else
    fail "Templates API"
fi

# Test 2: Integration Status APIs (public)
for service in gmail whatsapp slack telegram; do
    result=$(curl -s "$BASE_URL/api/integrations/$service/status")
    if echo "$result" | grep -q "connected"; then
        pass "$service status endpoint"
    else
        fail "$service status endpoint"
    fi
done

echo ""
echo "--- Orchestrator APIs ---"

# Test 3: Orchestrator Health
result=$(curl -s "$ORCHESTRATOR_URL/health")
if echo "$result" | grep -q "healthy"; then
    pass "Orchestrator health check"
else
    fail "Orchestrator health check"
fi

# Test 4: LiteLLM via Orchestrator
result=$(curl -s -X POST "$ORCHESTRATOR_URL/api/test-litellm" \
    -H "Authorization: Bearer $ORCH_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"message":"Reply with OK","model":"agent-light"}' 2>/dev/null)
if echo "$result" | grep -q "success.*true"; then
    pass "LiteLLM integration"
else
    fail "LiteLLM integration"
fi

# Test 5: WhatsApp Bridge Status
result=$(curl -s "$ORCHESTRATOR_URL/api/services/whatsapp-bridge/status" 2>/dev/null)
if echo "$result" | grep -q "running\|not_deployed"; then
    pass "WhatsApp bridge status endpoint"
    if echo "$result" | grep -q '"running": true'; then
        echo "  → WhatsApp bridge is RUNNING"
    else
        echo "  → WhatsApp bridge is NOT DEPLOYED"
    fi
else
    fail "WhatsApp bridge status endpoint"
fi

echo ""
echo "--- Summary ---"
echo "Public APIs: Templates, Integration status endpoints"
echo "Protected APIs: Agents, Credits, Onboarding, Billing (require Clerk auth)"
echo "Infrastructure: Orchestrator, LiteLLM"
echo ""
echo "To deploy WhatsApp bridge on Hetzner:"
echo "  1. Copy server/deploy.sh to the server"
echo "  2. Run: bash deploy.sh"
echo "  OR"
echo "  curl -X POST $ORCHESTRATOR_URL/api/services/whatsapp-bridge/deploy \\"
echo "    -H 'Authorization: Bearer $ORCH_SECRET'"
