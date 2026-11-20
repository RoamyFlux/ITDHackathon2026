/* =====================================================================
 * LÓGICA DEL INVENTARIO (funciones "puras": no tocan la pantalla ni la base de datos)
 * Aquí está la matemática de EarlyStock. Al ser puras se pueden probar solas (ver tests/).
 *
 * Cada producto es un objeto así:
 *   { id, nombre, categoria, creado (ms), paquetes (cajas completas), porPaquete (piezas por caja),
 *     sueltas (piezas fuera de caja), minimo y objetivo (en PAQUETES), costo, precio,
 *     lotes: [{ id, piezas, cad: "AAAA-MM-DD" }] }
 * Cada movimiento: { id, pid (id del producto), tipo: 'entrada' | 'salida' | 'merma', piezas, t (ms) }
 * ===================================================================== */

import { norm } from './formato.js'

// Milisegundos de un día.
export const DIA = 86400000

// hoy0(ahora) = ese día a las 00:00 (hora local).
export function hoy0 (ahora = Date.now()) {
  const d = new Date(ahora)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// fechaISO: milisegundos -> "AAAA-MM-DD" (formato de las columnas tipo date).
export function fechaISO (ms) {
  const f = new Date(ms)
  return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0')
}

// diasA(cad): días que faltan para una fecha "AAAA-MM-DD" (negativo = ya pasó, 0 = hoy).
export function diasA (cad, ahora = Date.now()) {
  return Math.round((new Date(cad + 'T00:00:00').getTime() - hoy0(ahora)) / DIA)
}

// sumarDias("2026-11-20", -1) -> "2026-11-19". Usa días de CALENDARIO (no 24 h), así no falla en cambios de horario.
export function sumarDias (cad, n) {
  const d = new Date(cad + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return fechaISO(d.getTime())
}

// Último día de una oferta para un lote: el día antes de que caduque, pero nunca antes de hoy.
// (Si caduca hoy, la oferta es "solo hoy"; nunca se propone una fecha que ya pasó.)
export function finDeOferta (cad, ahora = Date.now()) {
  const hoy = fechaISO(hoy0(ahora))
  const antes = sumarDias(cad, -1)
  return antes < hoy ? hoy : antes
}

// Total de piezas sin contar una por una. Ejemplo: 5 paquetes × 12 + 3 sueltas = 63 piezas.
export const totalPiezas = p => p.paquetes * p.porPaquete + p.sueltas

/* ---- VENDER (descontar) ----
 * Resta n piezas: primero de las sueltas; si no alcanzan, "abre" los paquetes necesarios
 * y lo que sobra del paquete abierto queda como sueltas.
 * Ejemplo: 2 paquetes de 12 y 0 sueltas, vendes 5 -> se abre 1 paquete: queda 1 paquete y 7 sueltas. */
export function descontar (p, n) {
  let falta = n
  const deSueltas = Math.min(p.sueltas, falta) // 1) gasta las sueltas
  p.sueltas -= deSueltas
  falta -= deSueltas
  if (falta > 0) { // 2) abre los paquetes que hagan falta
    const abrir = Math.ceil(falta / p.porPaquete)
    p.paquetes -= abrir
    p.sueltas += abrir * p.porPaquete - falta // lo no vendido queda suelto
  }
}

// Paquetes a comprar para llegar al objetivo (hacia arriba). Ej.: objetivo 48 pzas, hay 15 -> 3 paquetes de 12.
export function paquetesAPedir (p) {
  const falta = p.objetivo * p.porPaquete - totalPiezas(p)
  return falta > 0 ? Math.ceil(falta / p.porPaquete) : 0
}

/* ---- LOTES Y CADUCIDAD ----
 * Un lote = piezas que llegaron juntas con la misma fecha de caducidad. */
// Lotes con piezas, del que caduca primero al último.
export const lotesDe = p => (p.lotes || []).filter(l => l.piezas > 0)
  .sort((a, b) => (a.cad < b.cad ? -1 : a.cad > b.cad ? 1 : 0))

// Al vender se gasta primero el lote que caduca antes ("FEFO": primero en caducar, primero en salir).
export function consumirLotes (p, n) {
  for (const l of lotesDe(p)) {
    if (n <= 0) break
    const t = Math.min(l.piezas, n)
    l.piezas -= t
    n -= t
  }
  p.lotes = lotesDe(p)
}

// Si el stock baja a mano, los lotes no pueden sumar más que lo real: se recortan los que caducan más tarde.
export function ajustarLotes (p) {
  let exceso = (p.lotes || []).reduce((a, l) => a + l.piezas, 0) - totalPiezas(p)
  if (exceso > 0) {
    for (const l of lotesDe(p).reverse()) {
      const t = Math.min(l.piezas, exceso)
      l.piezas -= t
      exceso -= t
      if (exceso <= 0) break
    }
  }
  p.lotes = lotesDe(p)
}

// Lotes que ya caducaron y cuántas piezas suman (para "Retirar caducados").
export const caducadosDe = (p, ahora = Date.now()) => lotesDe(p).filter(l => diasA(l.cad, ahora) < 0)
export const piezasCaducadas = (p, ahora = Date.now()) => caducadosDe(p, ahora).reduce((a, l) => a + l.piezas, 0)

/* ---- ÍNDICE DE VENTAS ----
 * Recorre los movimientos UNA vez y guarda por producto:
 *   dias    = piezas vendidas en cada uno de los últimos 7 días de CALENDARIO [hace 6 días, …, hoy]
 *   suma    = total vendido en esos mismos 7 días (siempre igual a la suma de las barras de la gráfica)
 *   primera = momento de la primera venta (para saber cuántos días de historial hay)
 *   merma   = piezas retiradas por caducidad (no cuentan como venta)
 *   ultima  = momento de la última venta (para "sin ventas en 7 días")
 * "todos" = lo mismo pero de toda la tienda. Las llegadas (entrada) no cuentan. */
const vacio = () => ({ dias: [0, 0, 0, 0, 0, 0, 0], suma: 0, primera: Infinity, ultima: 0, merma: 0 })
export const SIN_VENTAS = Object.freeze({ dias: Object.freeze([0, 0, 0, 0, 0, 0, 0]), suma: 0, primera: Infinity, ultima: 0, merma: 0 })

export function indiceVentas (movimientos, ahora = Date.now()) {
  const hoy = hoy0(ahora)
  const desde = hoy - 6 * DIA // desde las 00:00 de hace 6 días
  const por = new Map()
  const todos = vacio()
  for (const m of movimientos) {
    if (m.t < desde || m.tipo === 'entrada') continue
    let v = por.get(m.pid)
    if (!v) por.set(m.pid, (v = vacio()))
    if (m.tipo === 'merma') { v.merma += m.piezas; todos.merma += m.piezas; continue }
    // Día de calendario de la venta: 0 = hoy, -1 = ayer, …, -6 (cuenta días reales, no bloques de 24 h).
    const d = -Math.round((hoy - hoy0(m.t)) / DIA)
    for (const x of [v, todos]) {
      x.suma += m.piezas
      x.primera = Math.min(x.primera, m.t)
      x.ultima = Math.max(x.ultima, m.t)
      x.dias[6 + Math.max(-6, Math.min(0, d))] += m.piezas
    }
  }
  return { por, todos }
}

/* ---- ANÁLISIS COMPLETO ----
 * crearAnalisis(productos, movimientos, {diasAviso, ahora}) devuelve funciones que responden todo lo que la
 * pantalla necesita: estado de cada producto, días que alcanza, lista de compras, etc.
 * Los resultados se guardan (memoria) para no recalcular lo mismo muchas veces en un mismo dibujo.
 *
 * ¿CÓMO SE ESTIMA CUÁNTOS DÍAS ALCANZA UN PRODUCTO?
 *   1) Se suman las piezas VENDIDAS en los últimos 7 días.
 *   2) Se divide entre los días de historial: 7, o menos si el producto es más nuevo (mínimo 1).
 *   3) Días que alcanza = piezas en tienda ÷ venta diaria.
 *   Ejemplo: Refresco vendió 62 pzas en 7 días -> 8.9 al día; hay 15 -> 15 ÷ 8.9 = 1.7 -> "~1 día".
 *
 * SEMÁFORO
 *   Por cantidad: crit = agotado o en/bajo el mínimo · low = hasta 1.5× el mínimo o ≤ 2 días · ok = suficiente.
 *   Por caducidad (lote más próximo): crit = ya caducó · low = caduca en ≤ diasAviso días.
 *   El producto muestra el PEOR de los dos. */
const RANGO = { ok: 0, low: 1, crit: 2 }
export const peor = (a, b) => (RANGO[a] >= RANGO[b] ? a : b)

export function crearAnalisis (productos, movimientos, { diasAviso = 7, ahora = Date.now() } = {}) {
  const idx = indiceVentas(movimientos, ahora)
  const memo = new WeakMap()
  const m = p => { let x = memo.get(p); if (!x) memo.set(p, (x = {})); return x }

  const ventasDe = pid => (pid ? (idx.por.get(pid) || SIN_VENTAS) : idx.todos)
  function diasHistorial (p) {
    const inicio = Math.min(p.creado || ahora, ventasDe(p.id).primera)
    return Math.min(7, Math.max(1, Math.ceil((ahora - inicio) / DIA)))
  }
  const consumoDiario = p => ventasDe(p.id).suma / diasHistorial(p)
  function diasRestantes (p) {
    const c = consumoDiario(p)
    return c > 0 ? totalPiezas(p) / c : null
  }
  function estado (p) {
    const x = m(p)
    if (x.s) return x.s
    const tot = totalPiezas(p)
    const min = p.minimo * p.porPaquete
    const d = diasRestantes(p)
    x.s = tot <= 0 || tot <= min ? 'crit' : (tot <= min * 1.5 || (d !== null && d <= 2)) ? 'low' : 'ok'
    return x.s
  }
  function estadoCad (p) {
    const x = m(p)
    if (x.c) return x.c
    const ls = lotesDe(p)
    if (!ls.length) return (x.c = 'ok')
    const d = diasA(ls[0].cad, ahora)
    return (x.c = d < 0 ? 'crit' : d <= diasAviso ? 'low' : 'ok')
  }
  const estadoTotal = p => { const x = m(p); return x.t || (x.t = peor(estado(p), estadoCad(p))) }

  // Lista de compras: todo producto que no esté en verde por cantidad, con los paquetes a pedir (mínimo 1).
  const compras = () => productos.filter(p => estado(p) !== 'ok').map(p => ({ p, paq: Math.max(paquetesAPedir(p), 1) }))

  // Resumen para las tarjetas de números y el anillo "% en riesgo".
  function resumen () {
    const crit = productos.filter(p => estado(p) === 'crit')
    const low = productos.filter(p => estado(p) === 'low')
    const lotesAlerta = []
    productos.forEach(p => lotesDe(p).forEach(l => {
      const d = diasA(l.cad, ahora)
      if (d <= diasAviso) lotesAlerta.push({ p, l, d })
    }))
    lotesAlerta.sort((a, b) => a.d - b.d)
    const enRiesgo = productos.filter(p => estadoTotal(p) !== 'ok').length
    return {
      crit,
      low,
      lotesAlerta,
      nCad: new Set(lotesAlerta.map(x => x.p.id)).size,
      enRiesgo,
      pct: productos.length ? Math.round(enRiesgo / productos.length * 100) : 0,
      nCompras: compras().length,
      // Valor aproximado (costo × piezas). Se muestra discreto: no es el dato principal de la app.
      valor: productos.reduce((a, p) => a + (p.costo || 0) * totalPiezas(p), 0)
    }
  }

  return { ahora, diasAviso, ventasDe, diasHistorial, consumoDiario, diasRestantes, estado, estadoCad, estadoTotal, compras, resumen }
}

/* =====================================================================
 * PRESENTACIONES Y SABORES
 * Cada producto registrado es una VARIANTE: nombre + presentación (600 ml, 1 L, 1 kg…) + sabor (Cola, Fresa…).
 * En pantalla se agrupan por nombre: una sola tarjeta "Refresco" con el stock de cada presentación y sabor.
 * ===================================================================== */
// Clave que identifica una variante sin importar mayúsculas, acentos ni espacios de más.
// "Refresco", "600 ml", "Cola" y "refresco ", "600 ML", "cola" son el MISMO producto (no se duplica).
const limpio = s => norm(String(s ?? '').trim()).replace(/\s+/g, ' ')
export const claveProducto = p => [p.nombre, p.presentacion, p.sabor].map(limpio).join('|')

// "Refresco · 600 ml · Cola" (sin las partes vacías). Se usa en alertas, compras, sugerencias y exportar.
export const nombreCompleto = p => [p.nombre, p.presentacion, p.sabor].map(x => String(x ?? '').trim()).filter(Boolean).join(' · ')
// Solo presentación y sabor ("600 ml · Cola"); vacío si el producto no tiene variantes.
export const nombreVariante = p => [p.presentacion, p.sabor].map(x => String(x ?? '').trim()).filter(Boolean).join(' · ')

// Agrupa las variantes por nombre (sin distinguir mayúsculas ni acentos), conservando el orden de entrada.
// Cada grupo: { clave, nombre, categoria, variantes:[…], total (piezas de todas las variantes) }.
export function agruparPorNombre (productos) {
  const grupos = new Map()
  for (const p of productos) {
    const k = limpio(p.nombre)
    let g = grupos.get(k)
    if (!g) grupos.set(k, (g = { clave: k, nombre: p.nombre, categoria: p.categoria || '', variantes: [], total: 0 }))
    g.variantes.push(p)
    g.total += totalPiezas(p)
  }
  return [...grupos.values()]
}

// Stock total por categoría: piezas, cuántos productos (por nombre) y cuántas variantes en riesgo.
// estadoDe(p) es opcional (del análisis) para contar las que requieren atención.
export function stockPorCategoria (productos, estadoDe = null) {
  const cats = new Map()
  for (const p of productos) {
    const c = p.categoria || 'Sin categoría'
    let x = cats.get(c)
    if (!x) cats.set(c, (x = { categoria: c, piezas: 0, nombres: new Set(), variantes: 0, enRiesgo: 0 }))
    x.piezas += totalPiezas(p)
    x.nombres.add(limpio(p.nombre))
    x.variantes++
    if (estadoDe && estadoDe(p) !== 'ok') x.enRiesgo++
  }
  return [...cats.values()].map(x => ({ categoria: x.categoria, piezas: x.piezas, productos: x.nombres.size, variantes: x.variantes, enRiesgo: x.enRiesgo }))
    .sort((a, b) => b.piezas - a.piezas || a.categoria.localeCompare(b.categoria, 'es'))
}

/* =====================================================================
 * OFERTAS
 * Una oferta: { id, pid (producto), tipo: 'porcentaje' | 'dos_por_uno' | 'precio', valor, termina ("AAAA-MM-DD" o null), nota }
 * ===================================================================== */
// ¿Sigue vigente? (sin fecha de fin = hasta que la quiten; con fecha = hasta ese día incluido)
export const ofertaVigente = (o, ahora = Date.now()) => !o.termina || diasA(o.termina, ahora) >= 0

// Precio por pieza con la oferta (null si el producto no tiene precio).
// 2×1 = la mitad por pieza al llevar dos.
export function precioConOferta (precio, o) {
  if (precio == null) return o.tipo === 'precio' ? o.valor : null
  if (o.tipo === 'porcentaje') return Math.round(precio * (100 - o.valor)) / 100
  if (o.tipo === 'dos_por_uno') return Math.round(precio * 50) / 100
  return o.valor
}

// Texto corto para la insignia: "−20 %", "2×1" o "$15.00".
export function etiquetaOferta (o) {
  if (o.tipo === 'porcentaje') return `−${o.valor} %`
  if (o.tipo === 'dos_por_uno') return '2×1'
  return '$' + Number(o.valor).toFixed(2)
}
