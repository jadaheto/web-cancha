/**
 * URL del backend en producción: se toma en tiempo de ejecución de BACKEND_URL
 * (window.__env, generado por docker/40-env-js.sh al arrancar el contenedor).
 * El navegador llama directamente a `${BACKEND_URL}/api`.
 */
const backendUrl = ((globalThis as { __env?: { backendUrl?: string } }).__env?.backendUrl ?? '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

export const environment = {
  production: true,
  apiUrl: backendUrl ? `${backendUrl}/api` : '/api',
};
