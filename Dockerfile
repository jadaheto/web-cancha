# ---------- Etapa de build ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration production

# ---------- Etapa de servido con nginx ----------
FROM nginx:1.27-alpine AS production
# URL PÚBLICA del backend que usará el navegador (sin barra final ni /api).
# Se lee al arrancar el contenedor: en Easypanel se define como variable de
# entorno del servicio del frontend. Ej.: https://api-cancha.midominio.com
ENV BACKEND_URL=http://localhost:3000
COPY nginx.conf /etc/nginx/conf.d/default.conf
# La imagen de nginx ejecuta los scripts de /docker-entrypoint.d/ antes de arrancar.
COPY docker/40-env-js.sh /docker-entrypoint.d/40-env-js.sh
RUN chmod +x /docker-entrypoint.d/40-env-js.sh
COPY --from=builder /app/dist/cancha-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
