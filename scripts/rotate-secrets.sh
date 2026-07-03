#!/bin/bash
# ==============================
# LinguistAI — Secret Rotation Script
# ==============================
# Rotates secrets in AWS Secrets Manager and restarts pods
# Usage: ./scripts/rotate-secrets.sh <environment>
# ==============================

set -euo pipefail

ENVIRONMENT="${1:-dev}"
PROJECT_NAME="linguistai"
SECRET_NAME="${PROJECT_NAME}/${ENVIRONMENT}/app-secrets"
NAMESPACE="linguistai"
AWS_REGION="ap-south-1"

echo "🔑 Rotating secrets for environment: ${ENVIRONMENT}"

# Verify AWS credentials
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo "❌ AWS credentials not configured"
    exit 1
}

# Get current secret
echo "📋 Fetching current secret..."
CURRENT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "${SECRET_NAME}" \
    --region "${AWS_REGION}" \
    --query 'SecretString' \
    --output text)

echo "✅ Current secret retrieved"

# Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 32)
echo "🆕 Generated new JWT secret"

# Update secret in AWS Secrets Manager
UPDATED_SECRET=$(echo "${CURRENT_SECRET}" | jq --arg jwt "${NEW_JWT_SECRET}" '.JWT_SECRET = $jwt')

aws secretsmanager put-secret-value \
    --secret-id "${SECRET_NAME}" \
    --secret-string "${UPDATED_SECRET}" \
    --region "${AWS_REGION}"

echo "✅ Secret updated in AWS Secrets Manager"

# Restart deployments to pick up new secrets
echo "🔄 Restarting deployments..."
kubectl rollout restart deployment/linguistai-server -n "${NAMESPACE}"
kubectl rollout status deployment/linguistai-server -n "${NAMESPACE}" --timeout=120s

echo "✅ Secret rotation complete!"
echo "⚠️  Note: Active user sessions using old JWT will need to re-authenticate."
