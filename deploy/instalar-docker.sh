#!/usr/bin/env bash
# Prepara una EC2 con Ubuntu para correr la plataforma: memoria swap y Docker.
# Se ejecuta una sola vez:  bash deploy/instalar-docker.sh
set -euo pipefail

# Una t3.micro tiene 1 GB de RAM: no alcanza para compilar las imágenes (npm ci, tsc, vite).
# 2 GB de swap en disco evitan que el sistema mate la compilación por falta de memoria.
if ! swapon --show | grep -q '/swapfile'; then
  echo '==> Creando 2 GB de memoria swap'
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
fi

if ! command -v docker > /dev/null; then
  echo '==> Instalando Docker y Docker Compose'
  curl -fsSL https://get.docker.com | sudo sh
fi

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo
echo 'Listo. Cierre la sesión SSH y vuelva a entrar para usar docker sin sudo.'
docker --version
docker compose version
