#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "Ejecutando seed inicial..."
npx prisma db seed

echo "Iniciando servidor..."
exec node dist/index.js
