// ─── MATRIZ DE PERMISOS POR ROL ──────────────────────────────────────────────
// Fuente única de verdad para menús y acciones. El menú y los botones consultan
// aquí; nunca hardcodear roles en los componentes.
//
//   SUPER_ADMIN → toda la cadena, consolidado, gestión de usuarios
//   ADMIN       → sus sucursales asignadas (puede tener varias)
//   CAJERO      → una sucursal fija, POS y caja

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
};

/** Pestañas visibles por rol (el orden define el menú). */
const PESTANAS_POR_ROL = {
  [ROLES.SUPER_ADMIN]: ['pos', 'inventario', 'ventas', 'dashboard', 'crm', 'diccionario'],
  [ROLES.ADMIN]: ['pos', 'inventario', 'ventas', 'dashboard', 'crm', 'diccionario'],
  [ROLES.CAJERO]: ['pos'],
};

/** ¿El rol puede ver esta pestaña? */
export function puedeVerPestana(rol, pestana) {
  return (PESTANAS_POR_ROL[rol] || []).includes(pestana);
}

/** ¿Puede adoptar medicamentos del diccionario al inventario? */
export function puedeAdoptarDiccionario(rol) {
  return rol === ROLES.SUPER_ADMIN || rol === ROLES.ADMIN;
}

/** ¿Puede ver reportes consolidados de TODAS las sucursales? */
export function veConsolidado(rol) {
  return rol === ROLES.SUPER_ADMIN;
}

/** ¿Puede gestionar usuarios (crear, asignar contraseñas/sucursales)? */
export function puedeGestionarUsuarios(rol) {
  return rol === ROLES.SUPER_ADMIN;
}

/** Etiqueta amigable del rol para la UI. */
export const ETIQUETAS_ROL = {
  [ROLES.SUPER_ADMIN]: 'Administrador General',
  [ROLES.ADMIN]: 'Administrador de Sucursal',
  [ROLES.CAJERO]: 'Cajero',
};