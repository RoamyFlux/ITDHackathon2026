/* =====================================================================
 * PLANES MENSUALES
 * Tres planes pensados para comercio local y pequeños negocios en México. Precios en pesos (MXN), IVA incluido.
 *
 * ¿POR QUÉ ESTOS PRECIOS? (cuentas aproximadas a noviembre de 2026; revísenlas antes de cobrar)
 *   Costo de mantener el servicio al mes:
 *     - Supabase Pro (base de datos, cuentas y fotos) ...... ~25 USD ≈ $450 MXN
 *     - Resend (correos de confirmación, más de 3,000/mes) .. ~20 USD ≈ $360 MXN
 *     - Dominio propio (~$300 al año) ......................... ≈ $25 MXN
 *     - GitHub Pages (la página) ............................... $0
 *     Total fijo ≈ $835 MXN al mes. El cobro con tarjeta (Mercado Pago/Stripe) se lleva ~4 % de cada pago.
 *   Con 6 clientes Pro, o 3 Max, se cubre el costo fijo; lo demás sirve para soporte y mejoras.
 *   Comparación: los sistemas de inventario y punto de venta en la nube suelen costar entre $300 y $1,000 MXN
 *   al mes, y los de otros países entre 25 y 90 USD. EarlyStock se queda abajo de ese rango a propósito:
 *   una tiendita debe poder pagarlo con lo que deja de perder en mermas y faltantes.
 *
 * Los límites se aplican en la app (aviso claro) y TAMBIÉN en la base de datos (schema.sql §16), que es la
 * que manda: aunque alguien modifique la página, no puede pasar del límite de su plan.
 * ===================================================================== */

export const PLANES = [
  {
    id: 'gratis',
    nombre: 'Gratis',
    lema: 'Para empezar y probar',
    precio: 0,
    precioAnual: 0,
    limites: { productos: 1000, ofertas: 3 },
    beneficios: [
      'Hasta 1,000 productos (contando cada presentación y sabor)',
      'Alertas de "se acaba" y de caducidad por lote',
      'Sugerencias para hoy y lista de compras',
      'Importar y exportar Excel',
      'Hasta 3 ofertas activas a la vez',
      'Seguridad completa: llaves de acceso, actividad y cierre por inactividad',
      'Soporte por correo (respuesta en 2 días hábiles)'
    ],
    limitaciones: [
      'Máximo 1,000 productos',
      'Máximo 3 ofertas activas',
      'Sin soporte por WhatsApp'
    ]
  },
  {
    id: 'pro',
    nombre: 'Pro',
    lema: 'Para la tienda que ya vende diario',
    destacado: true,
    precio: 149,
    precioAnual: 1490, // 2 meses gratis al pagar el año
    limites: { productos: 10000, ofertas: null },
    beneficios: [
      'Hasta 10,000 productos',
      'Ofertas ilimitadas',
      'Todo lo del plan Gratis',
      'Soporte por WhatsApp y correo (respuesta en 1 día hábil)',
      'Ayuda para subir tu primer Excel'
    ],
    limitaciones: [
      'Máximo 10,000 productos'
    ]
  },
  {
    id: 'max',
    nombre: 'Max',
    lema: 'Para minisúper y negocios con mucho surtido',
    precio: 349,
    precioAnual: 3490,
    limites: { productos: null, ofertas: null },
    beneficios: [
      'Productos ilimitados',
      'Ofertas ilimitadas',
      'Todo lo del plan Pro',
      'Soporte prioritario por WhatsApp (respuesta el mismo día hábil)',
      'Te ayudamos a dar de alta todo tu inventario',
      'Acceso anticipado a las funciones nuevas'
    ],
    limitaciones: []
  }
]

export const planPorId = id => PLANES.find(p => p.id === id) || PLANES[0]

// Precio en pesos: "$149" o "Gratis".
export const precioTxt = n => (n ? '$' + n.toLocaleString('es-MX') : 'Gratis')
// Límite en texto: "1,000" o "Ilimitados".
export const limiteTxt = n => (n == null ? 'Ilimitados' : n.toLocaleString('es-MX'))

// Ahorro al pagar el año: (12 × mensual − anual).
export const ahorroAnual = p => (p.precio ? p.precio * 12 - p.precioAnual : 0)

/* ¿Cabe agregar N productos más? Devuelve:
 *   { ok: true }                                   -> sí cabe
 *   { ok: false, disponibles, limite, plan }       -> no cabe (cuántos quedan libres)
 * limite null = ilimitado. */
export function cabenProductos (planId, usados, nuevos = 1) {
  const p = planPorId(planId)
  const limite = p.limites.productos
  if (limite == null || usados + nuevos <= limite) return { ok: true }
  return { ok: false, disponibles: Math.max(0, limite - usados), limite, plan: p }
}
export function cabenOfertas (planId, activas, nuevas = 1) {
  const limite = planPorId(planId).limites.ofertas
  return limite == null || activas + nuevas <= limite ? { ok: true } : { ok: false, limite }
}

// % de uso (para la barra "312 de 1,000 productos"); null si es ilimitado.
export const usoPct = (planId, usados) => {
  const l = planPorId(planId).limites.productos
  return l == null ? null : Math.min(100, Math.round(usados / l * 100))
}

// Plan vigente: si el plan de pago ya venció, vuelve a Gratis (los datos se conservan).
export function planVigente (suscripcion, ahora = Date.now()) {
  if (!suscripcion || !suscripcion.plan) return 'gratis'
  if (suscripcion.vence && new Date(suscripcion.vence + 'T23:59:59').getTime() < ahora) return 'gratis'
  return planPorId(suscripcion.plan).id
}
