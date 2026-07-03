#!/bin/bash
# ==============================
# LinguistAI — End-to-End Health Check
# ==============================
# Checks all components: server, client, DB connectivity
# Usage: ./scripts/health-check.sh [server_url] [client_url]
# ==============================

set -euo pipefail

SERVER_URL="${1:-http://localhost:5000}"
CLIENT_URL="${2:-http://localhost:5173}"

echo "🏥 LinguistAI Health Check"
echo "=========================="
echo ""

PASS=0
FAIL=0

check() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    printf "%-30s" "  ${name}..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${url}" 2>/dev/null || echo "000")

    if [ "${HTTP_STATUS}" = "${expected_status}" ]; then
        echo "✅ OK (${HTTP_STATUS})"
        PASS=$((PASS + 1))
    else
        echo "❌ FAIL (${HTTP_STATUS})"
        FAIL=$((FAIL + 1))
    fi
}

# Server checks
echo "🖥️  Server (${SERVER_URL})"
check "Health endpoint" "${SERVER_URL}/health"
check "Metrics endpoint" "${SERVER_URL}/metrics"
echo ""

# Client checks
echo "🌐 Client (${CLIENT_URL})"
check "Frontend" "${CLIENT_URL}/"
echo ""

# Kubernetes checks (if kubectl available)
if command -v kubectl &> /dev/null; then
    echo "☸️  Kubernetes"
    NAMESPACE="linguistai"

    printf "%-30s" "  Server pods..."
    SERVER_PODS=$(kubectl get pods -n "${NAMESPACE}" -l component=server --field-selector status.phase=Running --no-headers 2>/dev/null | wc -l)
    if [ "${SERVER_PODS}" -gt 0 ]; then
        echo "✅ ${SERVER_PODS} running"
        PASS=$((PASS + 1))
    else
        echo "❌ No running pods"
        FAIL=$((FAIL + 1))
    fi

    printf "%-30s" "  Client pods..."
    CLIENT_PODS=$(kubectl get pods -n "${NAMESPACE}" -l component=client --field-selector status.phase=Running --no-headers 2>/dev/null | wc -l)
    if [ "${CLIENT_PODS}" -gt 0 ]; then
        echo "✅ ${CLIENT_PODS} running"
        PASS=$((PASS + 1))
    else
        echo "❌ No running pods"
        FAIL=$((FAIL + 1))
    fi
    echo ""
fi

# Summary
echo "=========================="
echo "📊 Results: ${PASS} passed, ${FAIL} failed"

if [ ${FAIL} -gt 0 ]; then
    echo "❌ Health check FAILED"
    exit 1
else
    echo "✅ All checks PASSED"
    exit 0
fi
