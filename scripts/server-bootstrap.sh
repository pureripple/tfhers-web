#!/usr/bin/env bash
# One-time on the ECS (CentOS Stream 9). Run as root.
# Usage: bash server-bootstrap.sh
set -euo pipefail

BACKEND="${BACKEND:-/opt/tfhers/backend}"
FRONTEND="${FRONTEND:-/opt/tfhers/frontend/www}"
DEPLOY_USER="${DEPLOY_USER:-root}"
SSH_DIR="/root/.ssh"
AUTH_KEYS="$SSH_DIR/authorized_keys"

mkdir -p "$BACKEND/www" "$FRONTEND" "$SSH_DIR"
chmod 700 "$SSH_DIR"
touch "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

echo "Paste the GitHub Actions deploy PUBLIC key (one line, starts with ssh-ed25519 or ssh-rsa),"
echo "then press Enter and Ctrl-D:"
PUB=$(cat)
if ! grep -qxF "$PUB" "$AUTH_KEYS"; then
  echo "$PUB" >> "$AUTH_KEYS"
  echo "Public key installed."
else
  echo "Public key already present."
fi

# Ensure deploy can restart service + reload nginx without tty
if ! command -v rsync >/dev/null; then
  dnf install -y rsync || yum install -y rsync
fi

systemctl enable tfhers-management || true
nginx -t
echo "Bootstrap OK. Backend=$BACKEND Frontend=$FRONTEND"
