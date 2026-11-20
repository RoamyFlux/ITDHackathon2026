/* =====================================================================
 * MOTOR DE SUGERENCIAS
 * Revisa el inventario y propone acciones concretas, con números, para que el negocio venda más
 * y pierda menos. Cada sugerencia es un objeto:
 *   { id, tipo, prioridad (más alto = más urgente), titulo, detalle, producto, datos }
 * Tipos:
 *   retirar     -> hay piezas caducadas: quitarlas del inventario (merma).
 *   oferta      -> un lote caducará antes de venderse: hacer una oferta (2×1 o descuento).
 *   pedir       -> se acaba o ya se acabó: pedir N paquetes.
 *   promocionar -> hay mucho más de lo necesario y se vende poco: no comprar y promocionar.
 *   exhibir     -> nadie lo ha comprado en 7 días: ponerlo más a la vista.
 *   estrella    -> el más vendido de la semana: que nunca falte.
 * ===================================================================== */
import { totalPiezas, lotesDe, diasA, paquetesAPedir, piezasCaducadas, nombreCompleto, DIA } from './inventario.js'
import { cadTxt, diasCorto, dinero, plural } from './formato.js'

/* ---- ¿Qué descuento conviene? ----
 * Entre menos días falten, más fuerte la oferta (así se vende antes de que caduque):
 *   ≤ 2 días -> 2×1 o 30 %    ≤ 5 días -> 20 %    más días -> 10 % */
export function descuentoPara (dias) {
  if (dias <= 2) return { pct: 30, texto: '2×1 o 30 % de descuento' }
  if (dias <= 5) return { pct: 20, texto: '20 % de descuento' }
  return { pct: 10, texto: '10 % de descuento' }
}

/* ---- Piezas que sobrarán de cada lote ----
 * Se vende primero el lote que caduca antes. Para cada lote se calcula cuánto se venderá ANTES de su fecha:
 *   venta diaria × días disponibles − lo que se llevan los lotes anteriores.
 * Lo que no alcance a venderse es el "sobrante" que conviene ofertar.
 * Ejemplo: Huevo vende 1.3 pzas/día, lote de 26 pzas que caduca en 5 días -> se venden ~6, sobran ~20. */
export function sobrantesPorLote (p, consumoDiario, ahora = Date.now()) {
  let usadoPorAnteriores = 0
  return lotesDe(p).map(l => {
    const d = diasA(l.cad, ahora)
    const diasVenta = Math.max(1, d) // si caduca hoy, aún se puede vender hoy
    const vendibles = Math.max(0, Math.floor(consumoDiario * diasVenta) - usadoPorAnteriores)
    const seVenden = Math.min(l.piezas, vendibles)
    usadoPorAnteriores += seVenden
    return { lote: l, d, sobrante: l.piezas - seVenden }
  })
}

// Último día de la oferta: un día antes de que caduque (o "hoy" si caduca hoy o mañana).
function hastaCuando (cad, d) {
  if (d <= 1) return 'solo hoy'
  const f = new Date(new Date(cad + 'T00:00:00').getTime() - DIA)
  return 'hasta el ' + f.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

// conOferta = conjunto de ids de productos que ya tienen una oferta activa (no se vuelve a sugerir oferta).
export function generarSugerencias (productos, analisis, { conOferta = new Set() } = {}) {
  const { ahora, diasAviso } = analisis
  const lista = []
  const agregar = s => lista.push({ id: `${s.tipo}:${s.producto ? s.producto.id : ''}:${s.datos?.cad || ''}`, ...s })

  let estrella = null
  for (const p of productos) {
    const nom = nombreCompleto(p)
    const tot = totalPiezas(p)
    const consumo = analisis.consumoDiario(p)
    const ventas = analisis.ventasDe(p.id)

    // 1) Caducados -> retirar.
    const cad = piezasCaducadas(p, ahora)
    if (cad > 0) {
      agregar({
        tipo: 'retirar', prioridad: 100, producto: p,
        titulo: `Retira lo caducado de ${nom}`,
        detalle: `${plural(Math.min(cad, tot), 'pieza')} ya caducaron. Quítalas del anaquel y regístralas como merma para que tu inventario sea real.`,
        datos: { piezas: Math.min(cad, tot), costo: Math.min(cad, tot) * (p.costo || 0) }
      })
    }

    // 2) Por caducar con piezas que no alcanzarán a venderse -> oferta.
    for (const s of sobrantesPorLote(p, consumo, ahora)) {
      if (s.d < 0 || s.d > diasAviso || s.sobrante <= 0 || conOferta.has(p.id)) continue
      const desc = descuentoPara(s.d)
      const precioOferta = p.precio ? Math.round(p.precio * (100 - desc.pct)) / 100 : null
      agregar({
        tipo: 'oferta', prioridad: 90 - s.d, producto: p,
        titulo: `Haz una oferta de ${nom}`,
        detalle: `${plural(s.sobrante, 'pieza')} de ${s.lote.piezas} no se venderán antes de que caduquen (${cadTxt(s.d)}). ` +
          `Te sugerimos ${desc.texto}${precioOferta ? ` (de ${dinero(p.precio)} a ${dinero(precioOferta)})` : ''}` +
          `${p.costo ? `: así evitas perder hasta ${dinero(s.sobrante * p.costo)}` : ''}.`,
        datos: { cad: s.lote.cad, dias: s.d, sobrante: s.sobrante, pct: desc.pct, textoDescuento: desc.texto, precioOferta, hasta: hastaCuando(s.lote.cad, s.d) }
      })
    }

    // 3) Se acaba -> pedir.
    const est = analisis.estado(p)
    if (est !== 'ok') {
      const paq = Math.max(paquetesAPedir(p), 1)
      const dias = diasCorto(analisis.diasRestantes(p))
      agregar({
        tipo: 'pedir', prioridad: est === 'crit' ? 80 : 60, producto: p,
        titulo: `${est === 'crit' ? 'Pide ya' : 'Pide pronto'}: ${plural(paq, 'paquete')} de ${nom}`,
        detalle: tot <= 0 ? 'Se agotó: tus clientes no lo encontrarán.' : `Quedan ${plural(tot, 'pieza')}${dias ? ` y alcanzan ${dias}` : ''}. Con ${plural(paq, 'paquete')} llegas a tu objetivo.`,
        datos: { paquetes: paq }
      })
    }

    // 4) Sobreinventario: más del doble del objetivo y dura más de 30 días al ritmo actual.
    const objetivo = p.objetivo * p.porPaquete
    const dura = analisis.diasRestantes(p)
    if (objetivo > 0 && tot > objetivo * 2 && (dura === null ? analisis.diasHistorial(p) >= 7 : dura > 30)) {
      agregar({
        tipo: 'promocionar', prioridad: 30, producto: p,
        titulo: `Tienes de más: ${nom}`,
        detalle: `Hay ${plural(tot, 'pieza')} y tu objetivo es ${objetivo}${dura ? `; al ritmo actual duran ~${Math.floor(dura)} días` : ''}. No compres más por ahora y considera una promoción.`,
        datos: {}
      })
    }

    // 5) Sin ventas en 7 días (solo si el producto tiene al menos 7 días registrado y hay existencias).
    if (tot > 0 && ventas.suma === 0 && (ahora - (p.creado || ahora)) >= 7 * DIA) {
      agregar({
        tipo: 'exhibir', prioridad: 20, producto: p,
        titulo: `Nadie ha comprado ${nom} en 7 días`,
        detalle: 'Ponlo más a la vista (junto a la caja o a la altura de los ojos) o arma un paquete con un producto que sí se vende.',
        datos: {}
      })
    }

    if (ventas.suma > 0 && (!estrella || ventas.suma > estrella.n)) estrella = { p, n: ventas.suma }
  }

  // 6) El más vendido de la semana.
  if (estrella) {
    agregar({
      tipo: 'estrella', prioridad: 10, producto: estrella.p,
      titulo: `Tu más vendido: ${nombreCompleto(estrella.p)}`,
      detalle: `Vendiste ${plural(estrella.n, 'pieza')} esta semana. Asegura que nunca falte: considera subir su mínimo.`,
      datos: { piezas: estrella.n }
    })
  }

  return lista.sort((a, b) => b.prioridad - a.prioridad)
}

/* ---- Texto listo para compartir una oferta (WhatsApp, estado, letrero) ----
 * Ejemplo: "¡Oferta en Abarrotes Don Pepe! Leche 1 L con 30 % de descuento: ahora $17.50. Solo hoy." */
export function textoOferta (s, negocio = '') {
  const d = s.datos
  const que = d.pct >= 50 ? 'promoción 2×1' : d.pct === 30 ? '2×1 o 30 % de descuento' : `${d.pct} % de descuento`
  return `¡Oferta${negocio ? ' en ' + negocio : ''}! ${nombreCompleto(s.producto)} con ${que}` +
    `${d.precioOferta ? `: ahora ${dinero(d.precioOferta)}` : ''}. Válido ${d.hasta} o hasta agotar existencias.`
}
