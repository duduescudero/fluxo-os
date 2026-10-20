#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  umask 077
  printf 'POSTGRES_PASSWORD=Local!7%s\nBOOTSTRAP_PASSWORD=Local!7%s\nDEMO_ENABLED=false\nAPP_PORT=8080\n' "$(openssl rand -hex 24)" "$(openssl rand -hex 24)" > .env
fi
docker compose up --build -d --wait
printf '\nFluxo OS: http://localhost:8080\nUsuario: admin@fluxo.example\nSenha local inicial: '
sed -n 's/^BOOTSTRAP_PASSWORD=//p' .env
