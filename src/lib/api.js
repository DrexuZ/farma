// ─── CLIENTE HTTP CENTRAL DEL ECOSISTEMA FARMA NOVA ─────────────────────────
// Único punto donde se define la URL de la API. Todos los módulos importan de aquí.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5169';

/** Cabeceras base con el token JWT de la sesión (si existe). */
function cabeceras(extra) {
  const h = { ...(extra || {}) };
  const token = localStorage.getItem('token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/**
 * GET hacia la API. Devuelve el JSON parseado o lanza Error con el mensaje del servidor.
 */
export async function apiGet(ruta) {
  const respuesta = await fetch(`${API_URL}${ruta}`, { headers: cabeceras() });
  if (!respuesta.ok) {
    throw new Error(await extraerError(respuesta));
  }
  return respuesta.json();
}

/**
 * POST hacia la API con JSON. `esperado` = código HTTP de éxito (default 200/201).
 */
export async function apiPost(ruta, body, esperado) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: 'POST',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!respuesta.ok) {
    throw new Error(await extraerError(respuesta));
  }
  return respuesta.json();
}

/** Extrae el mensaje de error venga como JSON ({error|Error}) o texto plano. */
async function extraerError(respuesta) {
  try {
    const datos = await respuesta.json();
    return datos.error || datos.Error || datos.Mensaje || datos.mensaje || `Error HTTP ${respuesta.status}`;
  } catch {
    try {
      const texto = await respuesta.text();
      if (texto) return texto;
    } catch { /* sin cuerpo */ }
    return `Error HTTP ${respuesta.status}`;
  }
}