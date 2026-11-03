# ---------- Etapa de build ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration production

# ---------- Etapa de servido con nginx ----------
FROM nginx:1.27-alpine AS production
# URL del backend, sin barra final. El valor por defecto sirve para docker-compose;
# en un despliegue separado se define como variable de entorno del servicio.
ENV BACKEND_URL=http://backend:3000
# La imagen de nginx genera conf.d/default.conf desde esta plantilla al arrancar.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist/cancha-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
