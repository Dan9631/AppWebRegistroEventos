#!/usr/bin/env bash
# Crea los .env de producción en la EC2. No sobrescribe archivos que ya existan.
#
#   bash deploy/preparar-env.sh              → usa <ip-publica>.sslip.io como dominio
#   bash deploy/preparar-env.sh mi.dominio   → usa un dominio propio
#
# Asocie la IP elástica a la instancia ANTES de ejecutarlo: el dominio depende de la IP.
set -euo pipefail
cd "$(dirname "$0")/.."

# ---------- .env de la raíz: dominio y contraseña de PostgreSQL ----------
if [ -f .env ]; then
  echo '==> .env ya existe, se conserva'
else
  dominio="${1:-}"
  if [ -z "$dominio" ]; then
    # IP pública desde el servicio de metadatos de la instancia (IMDSv2)
    token=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
    ip=$(curl -sf -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4)
    dominio="${ip//./-}.sslip.io"
  fi
  # Solo letras y números: la contraseña va dentro de la URL de conexión.
  printf 'DOMINIO=%s\nPOSTGRES_PASSWORD=%s\n' "$dominio" "$(openssl rand -hex 24)" > .env
  chmod 600 .env
  echo "==> .env creado con DOMINIO=$dominio"
fi

# ---------- auth-service: llaves JWT nuevas y credenciales de Gmail ----------
auth_env=services/auth-service/.env
if [ -f "$auth_env" ]; then
  echo "==> $auth_env ya existe, se conserva"
else
  echo '==> Generando llaves JWT (RS256) para producción'
  llaves=$(docker run --rm -v "$PWD/services/auth-service/scripts:/scripts:ro" node:22-alpine \
    node /scripts/generate-keys.mjs)

  read -rp 'Cuenta de Gmail que enviará los correos: ' gmail_usuario
  read -rsp 'Contraseña de aplicación de Gmail (no se muestra): ' gmail_password
  echo

  {
    grep -vE '^(JWT_PRIVATE_KEY|JWT_PUBLIC_KEY|GMAIL_USER|GMAIL_APP_PASSWORD)=' services/auth-service/.env.example
    echo "$llaves"
    echo "GMAIL_USER=$gmail_usuario"
    echo "GMAIL_APP_PASSWORD=$gmail_password"
  } > "$auth_env"
  chmod 600 "$auth_env"
  echo "==> $auth_env creado"
fi

# ---------- feria-service: solo la llave pública de auth-service ----------
feria_env=services/feria-service/.env
if [ -f "$feria_env" ]; then
  echo "==> $feria_env ya existe, se conserva"
else
  {
    grep -v '^JWT_PUBLIC_KEY=' services/feria-service/.env.example
    grep '^JWT_PUBLIC_KEY=' "$auth_env"
  } > "$feria_env"
  chmod 600 "$feria_env"
  echo "==> $feria_env creado"
fi

echo
echo 'Siguiente paso: bash deploy/desplegar.sh'
