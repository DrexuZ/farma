// ─── WRAPPER GLOBAL DE FETCH CON JWT ─────────────────────────────────────────
// Intercepta TODOS los fetch() de la app (incluidos los del monolito AppLegacy)
// y añade el token Bearer. Si la API responde 401 con token presente, la sesión
// expiró → limpia localStorage y recarga al login.
//
// Nota: 401 = token ausente/inválido (lo devuelve el middleware JWT).
//       403 = autenticado pero sin permiso (clave/PIN/rol) → NO recarga.

const fetchOriginal = window.fetch;
let redirigiendo = false;

export function instalarFetchAuth() {
  window.fetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const respuesta = await fetchOriginal(url, { ...options, headers });

    if (
      respuesta.status === 401 &&
      token &&
      !redirigiendo &&
      !String(url).includes('/Auth/login')
    ) {
      redirigiendo = true;
      localStorage.removeItem('token');
      localStorage.removeItem('cajaAbierta');
      localStorage.removeItem('sesionCajaId');
      window.location.reload();
    }
    return respuesta;
  };
}