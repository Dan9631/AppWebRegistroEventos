#!/usr/bin/env bash
# Compila y levanta (o actualiza) la plataforma en la EC2.
#   bash deploy/desplegar.sh
# Para publicar cambios: git pull y volver a ejecutarlo.
set -euo pipefail
cd "$(dirname "$0")/.."

for archivo in .env services/auth-service/.env services/feria-service/.env; do
  if [ ! -f "$archivo" ]; then
    echo "Falta $archivo. Ejecute primero: bash deploy/preparar-env.sh" >&2
    exit 1
  fi
done

compose() {
  docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
}

# Uno a la vez: con 1 GB de RAM, compilar las tres imágenes en paralelo agota la memoria.
for servicio in auth-service feria-service frontend; do
  echo "==> Compilando $servicio"
  compose build "$servicio"
done

echo '==> Levantando servicios'
compose up -d --remove-orphans

# Las imágenes anteriores ocupan disco y ya no se usan.
docker image prune -f > /dev/null

compose ps
dominio=$(grep '^DOMINIO=' .env | cut -d= -f2)
echo
echo "Listo: https://$dominio"
echo 'La primera vez Caddy tarda unos segundos en obtener el certificado HTTPS.'
