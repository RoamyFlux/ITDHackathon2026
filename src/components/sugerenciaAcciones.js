/* =====================================================================
 * QUÉ HACE CADA SUGERENCIA AL TOCARLA (compartido por el panel y la campana)
 *   retirar -> retira lo caducado de ese producto      oferta -> abre la ventana con el texto de la oferta
 *   pedir   -> abre "Llegó mercancía" (o baja a la lista de compras)   otras -> abre el producto para editarlo
 * ===================================================================== */
export const ICONO_SUG = { retirar: 'trash', oferta: 'gift', pedir: 'truck', promocionar: 'tag', exhibir: 'eye', estrella: 'star' }
export const BOTON_SUG = { retirar: 'Retirar', oferta: 'Crear oferta', pedir: 'Ver lista de compras', promocionar: 'Ver producto', exhibir: 'Ver producto', estrella: 'Ajustar mínimo' }

export function accionSugerencia (s, inv, ui) {
  if (s.tipo === 'retirar') return inv.retirarCaducados([s.producto])
  if (s.tipo === 'oferta') return ui.abrir('oferta', { sugerencia: s })
  if (s.tipo === 'pedir') return ui.irA('compras')
  ui.abrir('producto', { producto: s.producto })
}
