/* =====================================================================
 * IMPORTAR / EXPORTAR EXCEL (parte "pura")
 * La lectura del archivo la hace un Web Worker (src/workers/excel.worker.js) para aislar la librería.
 * Aquí está cómo se interpretan los renglones ya leídos: detectar columnas, convertir números y
 * fechas, y decidir qué producto se crea, se actualiza o se omite.
 * ===================================================================== */
import { totalPiezas, fechaISO, DIA } from './inventario.js'
import { norm } from './formato.js'

/* ---- Columnas que entiende EarlyStock y sus sinónimos ----
 * Para adivinar qué columna del Excel es cada dato se comparan los encabezados (sin acentos ni mayúsculas)
 * con estas listas. req = obligatorio. */
export const CAMPOS = [
  { k: 'nombre', t: 'Producto', req: true, sin: ['producto', 'productos', 'nombre', 'nombre del producto', 'articulo', 'articulos', 'descripcion', 'item', 'mercancia'] },
  { k: 'categoria', t: 'Categoría', sin: ['categoria', 'categorias', 'tipo', 'departamento', 'depto', 'dpto', 'familia', 'linea', 'seccion', 'rubro', 'clasificacion'] },
  { k: 'paquetes', t: 'Paquetes (cajas)', sin: ['paquetes', 'paquete', 'cajas', 'caja', 'bultos', 'paq', 'paqs', 'fardos', 'packs', 'no de cajas', 'num cajas'] },
  { k: 'porPaquete', t: 'Piezas por paquete', sin: ['piezas por paquete', 'pzas por paquete', 'pzas/paq', 'contenido', 'unidades por caja', 'unidades por paquete', 'piezas por caja', 'por paquete', 'por caja', 'presentacion'] },
  { k: 'sueltas', t: 'Piezas sueltas', sin: ['sueltas', 'piezas sueltas', 'unidades sueltas', 'sueltos'] },
  { k: 'total', t: 'Existencia total (piezas)', sin: ['existencia', 'existencias', 'stock', 'cantidad', 'cant', 'inventario', 'total', 'total piezas', 'unidades', 'piezas', 'pzas', 'disponible', 'en tienda'] },
  { k: 'minimo', t: 'Mínimo (paquetes)', sin: ['minimo', 'stock minimo', 'min', 'punto de reorden', 'reorden'] },
  { k: 'objetivo', t: 'Objetivo (paquetes)', sin: ['objetivo', 'maximo', 'stock maximo', 'max', 'ideal', 'quiero tener'] },
  { k: 'costo', t: 'Costo por pieza', sin: ['costo', 'costo unitario', 'precio compra', 'precio de compra', 'costo por pieza'] },
  { k: 'precio', t: 'Precio de venta', sin: ['precio', 'precio venta', 'precio de venta', 'pv', 'precio publico'] },
  { k: 'cad', t: 'Caducidad', sin: ['caducidad', 'caduca', 'vencimiento', 'vence', 'fecha de caducidad', 'fecha caducidad', 'expira', 'expiracion'] }
]

// Encabezado "limpio": sin acentos, en minúsculas y sin signos. "Mínimo (paquetes)" -> "minimo paquetes".
export const limpiarEnc = h => norm(String(h ?? '')).replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim()

/* Adivina las columnas: puntúa cada par (dato, columna): igual = 3, empieza con = 2, contiene la palabra = 1
 * (+ un poco por sinónimos más largos, que son más específicos). Luego asigna de mayor a menor puntaje
 * sin repetir columnas. Así "Piezas por paquete" va a porPaquete y no a Paquetes. */
export function detectarColumnas (enc) {
  const pares = []
  enc.forEach((h, ci) => {
    const e = limpiarEnc(h)
    if (!e) return
    CAMPOS.forEach(c => c.sin.forEach(sn => {
      let pts = 0
      if (e === sn) pts = 3
      else if (e.startsWith(sn + ' ')) pts = 2
      else if ((' ' + e + ' ').includes(' ' + sn + ' ')) pts = 1
      if (pts) pares.push({ k: c.k, ci, pts: pts + sn.length / 100 })
    }))
  })
  pares.sort((a, b) => b.pts - a.pts)
  const mapa = {}
  const usadas = new Set()
  pares.forEach(x => { if (mapa[x.k] == null && !usadas.has(x.ci)) { mapa[x.k] = x.ci; usadas.add(x.ci) } })
  return mapa
}

// Celda -> número. Acepta "$1,250.50", "1,5" (coma decimal) y números. null = vacía, NaN = no es número.
export function numero (v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return isFinite(v) ? v : NaN
  let t = String(v).trim().replace(/[$\s]/g, '')
  if (t === '') return null
  t = /^-?\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '')
  const n = Number(t)
  return isFinite(n) ? n : NaN
}

/* Celda -> fecha "AAAA-MM-DD". Acepta el número de serie de Excel (días desde 1899-12-30),
 * "dd/mm/aaaa", "dd-mm-aa" y "aaaa-mm-dd". null = vacía, undefined = no se reconoce. */
export function parseFecha (v) {
  if (v === null || v === undefined || v === '') return null
  const dos = n => String(n).padStart(2, '0')
  const valida = (y, m, d) => {
    const f = new Date(y, m - 1, d)
    return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d ? `${y}-${dos(m)}-${dos(d)}` : undefined
  }
  if (typeof v === 'number') {
    if (!(v > 1 && v < 2958466)) return undefined
    const f = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * DIA)
    return f.getUTCFullYear() > 1900 ? valida(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate()) : undefined
  }
  if (v instanceof Date) return fechaISO(v.getTime())
  const t = String(v).trim()
  let m
  if ((m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return valida(+m[1], +m[2], +m[3])
  if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
    let y = +m[3]
    if (y < 100) y += 2000
    return valida(y, +m[2], +m[1])
  }
  return undefined
}

// Límites razonables por seguridad: nadie tiene un millón de cajas de un producto.
const MAXIMO = 1e6

// Convierte un renglón: nombre, categoría, números (n), caducidad y lista de errores.
export function convertirFila (fila, mapa, unificarCategoria = c => c) {
  const g = k => (mapa[k] == null ? '' : fila[mapa[k]])
  const tiene = k => mapa[k] != null && String(g(k) ?? '').trim() !== ''
  const errores = []
  const nombre = String(g('nombre') ?? '').trim().slice(0, 60)
  if (!nombre) errores.push('Sin nombre de producto')
  const n = {}
  for (const k of ['paquetes', 'porPaquete', 'sueltas', 'total', 'minimo', 'objetivo', 'costo', 'precio']) {
    if (!tiene(k)) continue
    const v = numero(g(k))
    if (Number.isNaN(v)) errores.push(`"${String(g(k)).slice(0, 20)}" no es un número`)
    else if (v < 0) errores.push('Tiene un número negativo')
    else if (v > MAXIMO) errores.push('Número demasiado grande')
    else n[k] = v
  }
  let cad = null
  if (tiene('cad')) {
    cad = parseFecha(g('cad'))
    if (cad === undefined) { errores.push(`Fecha "${String(g('cad')).slice(0, 20)}" no reconocida`); cad = null }
  }
  const categoria = tiene('categoria') ? unificarCategoria(String(g('categoria')).trim().slice(0, 30)) : null
  return { nombre, categoria, n, cad, errores }
}

// Reparte el stock en paquetes + sueltas. Con solo la existencia total: 63 pzas de 12 -> 5 paquetes y 3 sueltas.
export function stockDe (n, ppBase) {
  const pp = Math.max(1, Math.floor(n.porPaquete ?? ppBase ?? 1))
  let paq = n.paquetes
  let suel = n.sueltas
  if (paq == null && suel == null && n.total != null) {
    const t = Math.floor(n.total)
    paq = Math.floor(t / pp)
    suel = t - paq * pp
  }
  return { porPaquete: pp, paquetes: Math.floor(paq || 0), sueltas: Math.floor(suel || 0) }
}
const traeCantidad = n => ['paquetes', 'sueltas', 'total'].some(k => n[k] != null)

// Producto NUEVO: lo del archivo + valores por defecto (avisar con 1 paquete, tener 4).
export function productoNuevo (x) {
  return {
    nombre: x.nombre, categoria: x.categoria || '', ...stockDe(x.n, 1),
    minimo: x.n.minimo ?? 1, objetivo: x.n.objetivo ?? 4, costo: x.n.costo ?? null, precio: x.n.precio ?? null
  }
}

// Producto que YA EXISTE: solo cambia lo que trae el archivo.
export function cambiosPara (x, p) {
  const c = {}
  if (x.categoria != null) c.categoria = x.categoria
  if (traeCantidad(x.n)) Object.assign(c, stockDe(x.n, p.porPaquete))
  else if (x.n.porPaquete != null) c.porPaquete = Math.max(1, Math.floor(x.n.porPaquete))
  for (const k of ['minimo', 'objetivo', 'costo', 'precio']) if (x.n[k] != null) c[k] = x.n[k]
  return c
}

/* Decide qué pasa con cada renglón: "nuevo", "actualizar" (mismo nombre que uno existente en modo
 * actualizar) u "omitir" (tiene errores o el nombre se repite en el archivo). */
export function calcularImport (filas, mapa, modo, productos, unificarCategoria) {
  const existentes = new Map(productos.map(p => [norm(p.nombre.trim()), p]))
  const vistos = new Set()
  return filas.map(f => {
    const x = convertirFila(f, mapa, unificarCategoria)
    const clave = norm(x.nombre)
    if (x.nombre && vistos.has(clave)) x.errores.push('Nombre repetido en el archivo')
    vistos.add(clave)
    const p = existentes.get(clave)
    x.accion = x.errores.length ? 'omitir' : (modo === 'actualizar' && p) ? 'actualizar' : 'nuevo'
    x.p = p
    x.vista = x.accion === 'actualizar' ? { ...p, ...cambiosPara(x, p) } : productoNuevo(x)
    x.total = totalPiezas(x.vista)
    return x
  })
}

/* Busca la fila de encabezados (la primera, dentro de las 10 primeras, con 2 o más celdas llenas; así se
 * saltan títulos como "Inventario de mi tienda") y devuelve encabezados y renglones con datos. */
export function analizarHoja (aoa) {
  let ie = aoa.slice(0, 10).findIndex(r => r.filter(c => String(c ?? '').trim() !== '').length >= 2)
  if (ie < 0) ie = 0
  const enc = (aoa[ie] || []).map(h => String(h ?? '').trim())
  const filas = aoa.slice(ie + 1).filter(r => r.some(c => String(c ?? '').trim() !== ''))
  return { enc, filas, mapa: detectarColumnas(enc) }
}

/* ---- SEGURIDAD AL EXPORTAR ----
 * "Inyección de fórmulas": si un nombre empieza con = + - @ (o tabulador), Excel podría ejecutarlo como
 * fórmula al abrir el CSV. Se le antepone un apóstrofo para que se vea como texto. */
export function celdaSegura (v) {
  if (typeof v !== 'string') return v
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v
}

// Encabezados de la plantilla y de la exportación (lo exportado se puede volver a importar).
export const ENC_PLANTILLA = ['Producto', 'Categoría', 'Paquetes', 'Piezas por paquete', 'Piezas sueltas', 'Mínimo (paquetes)', 'Objetivo (paquetes)', 'Costo por pieza', 'Precio de venta', 'Caducidad (dd/mm/aaaa)']
export const ddmmaaaa = iso => (iso ? iso.split('-').reverse().join('/') : '')

// CSV que abre Excel con acentos (BOM al inicio), con celdas protegidas contra fórmulas.
export function aCSV (filas) {
  return '﻿' + filas.map(r => r.map(c => '"' + String(celdaSegura(c ?? '')).replace(/"/g, '""') + '"').join(',')).join('\n')
}
