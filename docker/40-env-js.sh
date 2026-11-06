#!/bin/sh
# Genera /env.js con la URL del backend que usará el navegador.
# La lee de BACKEND_URL al arrancar el contenedor: basta con cambiar la
# variable en Easypanel y reiniciar el servicio (no hace falta recompilar).
set -eu

url="${BACKEND_URL:-}"
# Sin barra final ni sufijo /api (se agrega en la app).
url="$(printf '%s' "$url" | sed -e 's#/*$##' -e 's#/api$##')"
# Escapa comillas y barras invertidas para un literal JS seguro.
esc="$(printf '%s' "$url" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"

cat > /usr/share/nginx/html/env.js <<JS
window.__env = { backendUrl: "${esc}" };
JS
echo "env.js: backendUrl=${url:-<vacío>}"
