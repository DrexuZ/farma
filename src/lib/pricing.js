// ─── LÓGICA DE PRECIOS DEL ECOSISTEMA FARMA NOVA ────────────────────────────
// Política comercial de la cadena: valor agregado (markup) del 33.33% sobre el
// costo de adquisición, con redondeo AL ALZA del precio de venta.
//
//   Markup  = (Venta - Compra) / Compra × 100   ← lo que el cliente quiere ver
//   Margen  = (Venta - Compra) / Venta  × 100   ← NO usar; confunde (24.9%)
//
// Ejemplo: compra 2.20 → venta 2.93 (≈3 redondeado) → markup 33.33% (36.4% con redondeo)

export const MARKUP_POR_DEFECTO = 33.33;

/** Precio de venta sugerido: compra × (1 + markup/100). */
export function precioVentaSugerido(precioCompra, markup = MARKUP_POR_DEFECTO) {
  const compra = Number(precioCompra) || 0;
  if (compra <= 0) return 0;
  return compra * (1 + (Number(markup) || 0) / 100);
}

/** Precio de venta con redondeo al alza (política de la cadena). */
export function precioVentaRedondeado(precioCompra, markup = MARKUP_POR_DEFECTO) {
  return Math.ceil(precioVentaSugerido(precioCompra, markup));
}

/** Utilidad en Bs: venta - compra. */
export function utilidad(precioCompra, precioVenta) {
  return (Number(precioVenta) || 0) - (Number(precioCompra) || 0);
}

/**
 * Markup real entre compra y venta (lo que muestra la UI).
 * Devuelve 0 si no hay costo (evita división por cero / valores absurdos).
 */
export function markupPorcentaje(precioCompra, precioVenta) {
  const compra = Number(precioCompra) || 0;
  if (compra <= 0) return 0;
  return (((Number(precioVenta) || 0) - compra) / compra) * 100;
}

/** Formatea el markup con 1 decimal: 33.3 → "33.3%". */
export function markupTexto(precioCompra, precioVenta) {
  return `${markupPorcentaje(precioCompra, precioVenta).toFixed(1)}%`;
}