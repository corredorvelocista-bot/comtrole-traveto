#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Dependências ausentes. Instalando dependências do projeto..."
  npm install
fi
echo "Iniciando o Anotei localmente. Abra http://localhost:5173/ no navegador."
npm run dev -- --host 127.0.0.1
