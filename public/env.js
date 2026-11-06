// Configuración en tiempo de ejecución. En Docker este archivo se reescribe al
// arrancar el contenedor a partir de la variable BACKEND_URL (ver docker/env.sh).
// Vacío = se usa el valor de src/environments (p. ej. ng serve → localhost:3000).
window.__env = window.__env || {};
