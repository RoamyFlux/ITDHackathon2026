/* =====================================================================
 * INVENTARIO (datos y acciones)
 * productos / movimientos = copia de lo que hay en la base para esta sesión. La pantalla se dibuja a partir
 * de aquí. Todas las acciones que cambian datos pasan por guardar():
 *   1) bloquea botones  2) escribe en la base  3) vuelve a leer  4) avisa "listo" (con "Deshacer" si aplica).
 * Rendimiento: productos se guarda en un shallowRef con objetos "crudos" (markRaw): Vue no vigila cada
 * campo de cada producto, solo cuando llega la lista nueva. Así 1000+ productos se dibujan rápido.
 * ===================================================================== */
import { defineStore } from 'pinia'
import { ref, shallowRef, computed, markRaw, watch } from 'vue'
import { useSesion } from './sesion.js'
import { useAvisos } from './avisos.js'
import { usePreferencias } from './preferencias.js'
import { deDB, aDB } from '../lib/almacen.js'
import { DIA, hoy0, fechaISO, totalPiezas, descontar, consumirLotes, ajustarLotes, lotesDe, piezasCaducadas, crearAnalisis } from '../logica/inventario.js'
import { generarSugerencias } from '../logica/sugerencias.js'
import { cambiosPara } from '../logica/excel.js'
import { dinero, norm, plural } from '../logica/formato.js'

/* Tienda de ejemplo. Cada fila: nombre, categoría, paquetes, piezas por paquete, sueltas, mínimo (paq),
 * objetivo (paq), costo, precio y ventas de cada uno de los últimos 7 días. */
const EJEMPLO = [
  ['Refresco 600 ml', 'Bebidas', 1, 12, 3, 1.5, 5, 11, 16, [9, 8, 10, 7, 9, 11, 8]],
  ['Galletas Marías', 'Botanas', 6, 10, 2, 1, 4, 6, 10, [2, 3, 1, 2, 2, 3, 2]],
  ['Leche 1 L', 'Lácteos', 2, 12, 0, 2, 4, 19, 25, [6, 7, 5, 6, 8, 7, 6]],
  ['Huevo (cartón 30)', 'Básicos', 4, 6, 2, 1, 3, 95, 120, [1, 1, 2, 1, 1, 2, 1]],
  ['Arroz 1 kg', 'Básicos', 3, 10, 5, 1, 3, 22, 29, [1, 2, 1, 1, 2, 1, 1]],
  ['Jabón de barra', 'Limpieza', 0, 20, 4, 0.5, 2, 8, 12, [1, 0, 1, 1, 0, 1, 1]],
  ['Papel higiénico 4 pzas', 'Limpieza', 5, 12, 0, 1, 3, 28, 38, [2, 2, 3, 2, 2, 3, 2]],
  ['Sopa instantánea', 'Botanas', 1, 24, 6, 1, 3, 9, 14, [4, 5, 4, 6, 5, 5, 4]],
  ['Yogur bebible', 'Lácteos', 3, 8, 0, 1, 3, 9, 14, [2, 1, 2, 2, 1, 2, 2]],
  ['Atún en lata', 'Básicos', 12, 12, 0, 1, 3, 17, 24, [0, 0, 0, 0, 0, 0, 0]]
]
// Lotes de ejemplo: [piezas, días para caducar]. Negativo = ya caducó.
const CAD_EJEMPLO = { 'Leche 1 L': [[10, 3], [14, 20]], 'Galletas Marías': [[20, -2], [42, 60]], 'Huevo (cartón 30)': [[26, 5]], 'Sopa instantánea': [[30, 120]], 'Yogur bebible': [[24, 2]] }

export const useInventario = defineStore('inventario', () => {
  const sesion = useSesion()
  const avisos = useAvisos()
  const prefsStore = usePreferencias()

  const productos = shallowRef([])
  const movimientos = shallowRef([])
  const cargando = ref(false)
  const ocupado = ref(false)
  const animar = ref(false) // la próxima vez que se dibuje, entrar con animación
  watch(animar, v => { if (v) setTimeout(() => { animar.value = false }, 1500) })
  const reloj = ref(Date.now()) // se actualiza cada minuto para que "caduca hoy" cambie solo a medianoche
  setInterval(() => { reloj.value = Date.now() }, 60000)

  // Filtros de la lista (los usan el panel, la paleta de comandos y las alertas).
  const filtros = ref({ q: '', estado: '', categoria: '' })
  const ordenTabla = ref({ col: 'estado', dir: 1 })

  const db = () => sesion.almacen

  /* ---- Análisis ----
   * Se recalcula cuando cambian los datos, los días de aviso o el día (reloj). */
  const analisis = computed(() => crearAnalisis(productos.value, movimientos.value, { diasAviso: prefsStore.prefs.diasAviso, ahora: reloj.value }))
  const resumen = computed(() => analisis.value.resumen())
  const sugerencias = computed(() => generarSugerencias(productos.value, analisis.value))
  const categorias = computed(() => [...new Set(productos.value.map(p => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')))

  // Si escriben "bebidas" y ya existe "Bebidas", se usa la escritura existente (no se duplican categorías).
  const porNorm = computed(() => new Map(categorias.value.map(c => [norm(c), c])))
  function unificarCategoria (c) {
    const t = String(c || '').trim().slice(0, 30)
    return t ? (porNorm.value.get(norm(t)) || t) : ''
  }

  /* ---- Leer todo ---- */
  async function cargarTodo () {
    const desde = new Date(Date.now() - 8 * DIA).toISOString()
    const r = await db().leer(desde)
    const prods = r.productos.map(x => markRaw(deDB(x)))
    const porId = new Map(prods.map(p => [p.id, p]))
    r.lotes.forEach(l => { const p = porId.get(l.producto_id); if (p) p.lotes.push({ id: l.id, piezas: l.piezas, cad: l.caducidad }) })
    productos.value = prods
    movimientos.value = r.movimientos.map(m => ({ id: m.id, pid: m.producto_id, tipo: m.tipo, piezas: m.piezas, t: Date.parse(m.created_at) }))
    reloj.value = Date.now()
  }
  async function cargarInicial () {
    cargando.value = true
    try { await cargarTodo() } catch (e) { avisos.avisar('No se pudieron cargar tus datos: ' + ((e && e.message) || 'revisa tu conexión')) }
    cargando.value = false
    animar.value = true
  }
  // Al entrar o salir se limpia todo (otro usuario no debe ver lo del anterior).
  // immediate: si ya había sesión cuando se crea este store (por ejemplo, justo después de entrar), carga de una vez.
  watch(() => sesion.almacen, a => {
    productos.value = []; movimientos.value = []
    filtros.value = { q: '', estado: '', categoria: '' }
    if (a) cargarInicial()
  }, { immediate: true })

  /* ---- guardar(fn, okMsg, {anim, reg}) ----
   * Envoltorio para TODA acción que cambia datos. Si algo falla, avisa y vuelve a leer para no dejar datos a medias.
   * reg = registro para DESHACER (fotos de cómo estaban los productos + movimientos creados). */
  async function guardar (fn, okMsg, { anim = false, reg = null } = {}) {
    if (ocupado.value) return false
    ocupado.value = true
    let ok = true
    try { await fn(); await cargarTodo() } catch (e) {
      ok = false
      const msg = (e && e.message) || 'revisa tu conexión'
      avisos.avisar('No se pudo guardar: ' + msg + (/permission denied|does not exist/i.test(msg) ? '. Ejecuta de nuevo supabase/schema.sql en Supabase.' : ''))
      try { await cargarTodo() } catch (_) {}
    }
    animar.value = anim
    ocupado.value = false
    if (ok && okMsg) avisos.avisar(typeof okMsg === 'function' ? okMsg() : okMsg, 'ok', reg && reg.fotos.length ? { texto: 'Deshacer', fn: () => deshacer(reg) } : null)
    return ok
  }

  /* ---- Deshacer ----
   * Antes de una venta, llegada o retiro se guarda una "foto" de cada producto. Deshacer regresa las
   * cantidades y los lotes a esa foto y borra los movimientos creados. */
  const nuevoRegistro = () => ({ fotos: [], movs: [] })
  const fotoProducto = p => ({ id: p.id, paquetes: p.paquetes, sueltas: p.sueltas, lotes: lotesDe(p).map(l => ({ piezas: l.piezas, cad: l.cad })) })
  function deshacer (reg) {
    return guardar(async () => {
      for (const f of reg.fotos) {
        await db().actualizarProducto(f.id, { paquetes: f.paquetes, sueltas: f.sueltas })
        await db().borrarLotesDe([f.id])
        await db().insertarLotes(f.lotes.map(l => ({ producto_id: f.id, piezas: l.piezas, caducidad: l.cad })))
      }
      if (reg.movs.length) await db().borrarMovimientos(reg.movs)
    }, 'Listo: se deshizo el último cambio')
  }

  // Copia de trabajo de un producto (para cambiarlo sin tocar lo que se ve hasta guardar).
  const copia = id => { const p = productos.value.find(x => x.id === id); return p ? structuredClone({ ...p }) : null }
  const fotoLotes = p => (p.lotes || []).map(l => ({ id: l.id, piezas: l.piezas }))
  // Compara los lotes de antes con los de ahora: lote en 0 -> se borra; con menos piezas -> se actualiza.
  async function sincronizarLotes (antes, p) {
    const ahora = new Map((p.lotes || []).map(l => [l.id, l.piezas]))
    for (const a of antes) {
      const n = ahora.get(a.id) ?? 0
      if (n === a.piezas) continue
      if (n <= 0) await db().borrarLote(a.id)
      else await db().actualizarLote(a.id, n)
    }
  }

  /* ---- Productos ---- */
  function guardarProducto (id, data, cad) {
    return guardar(async () => {
      if (id) {
        const p = copia(id)
        const antes = fotoLotes(p)
        Object.assign(p, data)
        ajustarLotes(p)
        await db().actualizarProducto(id, aDB(p))
        await sincronizarLotes(antes, p)
      } else {
        const [r] = await db().insertarProductos([aDB(data)])
        if (cad && totalPiezas(data) > 0) await db().insertarLotes([{ producto_id: r.id, piezas: totalPiezas(data), caducidad: cad }])
      }
    }, id ? 'Producto actualizado' : `"${data.nombre}" agregado al inventario`)
  }
  async function eliminar (p) {
    const ok = await avisos.confirmar({ titulo: `¿Eliminar "${p.nombre}"?`, mensaje: 'También se borrarán sus lotes y su historial de ventas.', boton: 'Eliminar' })
    if (ok) guardar(() => db().borrarProducto(p.id), 'Producto eliminado')
  }

  /* ---- Venta ----
   * Descuenta piezas (abre paquetes si hace falta), gasta primero el lote que caduca antes y guarda "salida". */
  function vender (id, n) {
    const reg = nuevoRegistro()
    const nombre = (productos.value.find(x => x.id === id) || {}).nombre
    return guardar(async () => {
      const p = copia(id)
      if (!p) return
      reg.fotos.push(fotoProducto(p))
      const n2 = Math.min(n, totalPiezas(p))
      if (n2 <= 0) return
      const antes = fotoLotes(p)
      descontar(p, n2)
      consumirLotes(p, n2)
      await db().actualizarProducto(p.id, { paquetes: p.paquetes, sueltas: p.sueltas })
      await sincronizarLotes(antes, p)
      reg.movs.push(await db().insertarMovimiento({ producto_id: p.id, tipo: 'salida', piezas: n2 }))
    }, `Venta registrada: ${nombre}`, { reg })
  }

  /* ---- Llegada de mercancía ----
   * unidad 'paq' -> suma paquetes completos · 'pza' -> suma piezas sueltas. Si trae fecha, crea un lote. */
  function llegada (id, n, unidad, cad) {
    const reg = nuevoRegistro()
    const p0 = productos.value.find(x => x.id === id)
    const pzas = unidad === 'pza' ? n : n * p0.porPaquete
    const detalle = unidad === 'pza' ? plural(n, 'pieza') : `${plural(n, 'paquete')} (${pzas} pzas)`
    return guardar(async () => {
      const p = copia(id)
      if (!p) return
      reg.fotos.push(fotoProducto(p))
      await db().actualizarProducto(p.id, unidad === 'pza' ? { sueltas: p.sueltas + n } : { paquetes: p.paquetes + n })
      if (cad) await db().insertarLotes([{ producto_id: p.id, piezas: pzas, caducidad: cad }])
      reg.movs.push(await db().insertarMovimiento({ producto_id: p.id, tipo: 'entrada', piezas: pzas }))
    }, `Llegada registrada: ${p0.nombre} · ${detalle}`, { reg })
  }

  /* ---- Retirar caducados (merma) ----
   * Quita del inventario las piezas de lotes ya caducados y lo registra como "merma" (no cuenta como venta). */
  async function retirarCaducados (lista = productos.value) {
    const items = lista.map(p => ({ p, n: Math.min(piezasCaducadas(p), totalPiezas(p)) })).filter(x => x.n > 0)
    if (!items.length) return avisos.avisar('No hay productos caducados para retirar.', 'ok')
    const piezas = items.reduce((a, x) => a + x.n, 0)
    const costo = items.reduce((a, x) => a + x.n * (x.p.costo || 0), 0)
    const ok = await avisos.confirmar({
      titulo: items.length === 1 ? `¿Retirar lo caducado de "${items[0].p.nombre}"?` : `¿Retirar lo caducado de ${items.length} productos?`,
      mensaje: `Se quitarán ${plural(piezas, 'pieza')} del inventario${costo ? ` (pérdida aprox. ${dinero(costo)})` : ''}. Quedará registrado como merma.`,
      boton: 'Retirar caducados'
    })
    if (!ok) return
    const reg = nuevoRegistro()
    guardar(async () => {
      for (const { p: p0, n } of items) {
        const p = copia(p0.id)
        if (!p) continue
        reg.fotos.push(fotoProducto(p))
        const antes = fotoLotes(p)
        descontar(p, n)
        consumirLotes(p, n)
        await db().actualizarProducto(p.id, { paquetes: p.paquetes, sueltas: p.sueltas })
        await sincronizarLotes(antes, p)
        reg.movs.push(await db().insertarMovimiento({ producto_id: p.id, tipo: 'merma', piezas: n }))
      }
    }, `Se retiraron ${plural(piezas, 'pieza')} caducada${piezas === 1 ? '' : 's'}`, { reg })
  }

  /* ---- Borrar todo y tienda de ejemplo ---- */
  async function borrarTodo () {
    const ok = await avisos.confirmar({ titulo: '¿Borrar todo el inventario?', mensaje: 'Se eliminarán todos tus productos, lotes y ventas. Esta acción no se puede deshacer.', boton: 'Borrar todo' })
    if (ok) guardar(() => db().borrarTodo(), 'Inventario borrado')
  }
  async function cargarEjemplo (preguntar = true) {
    if (preguntar && productos.value.length && !(await avisos.confirmar({ titulo: '¿Cargar la tienda de ejemplo?', mensaje: 'Esto reemplazará tu inventario actual con productos de ejemplo.', boton: 'Sí, cargar ejemplo', peligro: false }))) return
    return guardar(async () => {
      await db().borrarTodo()
      const nuevos = await db().insertarProductos(EJEMPLO.map(d => ({ nombre: d[0], categoria: d[1], paquetes: d[2], por_paquete: d[3], sueltas: d[4], minimo: d[5], objetivo: d[6], costo: d[7], precio: d[8] })))
      const idDe = Object.fromEntries(nuevos.map(r => [r.nombre, r.id]))
      const lotes = []
      const movs = []
      const ahora = Date.now()
      EJEMPLO.forEach(d => {
        (CAD_EJEMPLO[d[0]] || []).forEach(([piezas, dias]) => lotes.push({ producto_id: idDe[d[0]], piezas, caducidad: fechaISO(hoy0() + dias * DIA) }))
        d[9].forEach((v, i) => { if (v > 0) movs.push({ producto_id: idDe[d[0]], tipo: 'salida', piezas: v, created_at: new Date(ahora - (i + 0.5) * DIA).toISOString() }) })
      })
      // Los productos de ejemplo se marcan como dados de alta hace 10 días (así las sugerencias tienen historial).
      await db().upsertProductos(nuevos.map(r => ({ ...r, created_at: new Date(ahora - 10 * DIA).toISOString() })))
      await db().insertarLotes(lotes)
      await db().insertarMovimientos(movs)
    }, 'Tienda de ejemplo cargada', { anim: true })
  }

  /* ---- Importar desde Excel ----
   * res = resultado de calcularImport (logica/excel.js). Nuevos en bloques de 200 (con lote si trae fecha)
   * y actualizaciones con "upsert" en bloques de 200 (una llamada por bloque, no una por producto). */
  function importar (res) {
    const nuevos = res.filter(x => x.accion === 'nuevo')
    const act = res.filter(x => x.accion === 'actualizar')
    const omit = res.length - nuevos.length - act.length
    return guardar(async () => {
      for (let i = 0; i < nuevos.length; i += 200) {
        const bloque = nuevos.slice(i, i + 200)
        const creados = await db().insertarProductos(bloque.map(x => aDB(x.vista)))
        const idDe = new Map(creados.map(r => [r.nombre, r.id]))
        await db().insertarLotes(bloque.filter(x => x.cad && totalPiezas(x.vista) > 0 && idDe.has(x.vista.nombre))
          .map(x => ({ producto_id: idDe.get(x.vista.nombre), piezas: totalPiezas(x.vista), caducidad: x.cad })))
      }
      const cambiados = act.map(x => {
        const p = copia(x.p.id)
        if (!p) return null
        const antes = fotoLotes(p)
        Object.assign(p, cambiosPara(x, p))
        if (!x.cad) ajustarLotes(p)
        return { x, p, antes }
      }).filter(Boolean)
      for (let i = 0; i < cambiados.length; i += 200) await db().upsertProductos(cambiados.slice(i, i + 200).map(({ p }) => ({ id: p.id, ...aDB(p) })))
      // Con fecha: los lotes del producto se reemplazan por uno con todo su stock. Sin fecha: se recortan los que sobren.
      const conFecha = cambiados.filter(c => c.x.cad)
      for (let i = 0; i < conFecha.length; i += 200) {
        const b = conFecha.slice(i, i + 200)
        await db().borrarLotesDe(b.map(c => c.p.id))
        await db().insertarLotes(b.filter(c => totalPiezas(c.p) > 0).map(c => ({ producto_id: c.p.id, piezas: totalPiezas(c.p), caducidad: c.x.cad })))
      }
      for (const c of cambiados) if (!c.x.cad) await sincronizarLotes(c.antes, c.p)
      sesion.registrarEvento('importacion', `${nuevos.length} nuevos, ${act.length} actualizados`)
    }, `Importación lista: ${plural(nuevos.length, 'nuevo')}, ${plural(act.length, 'actualizado')}${omit ? `, ${plural(omit, 'omitido')}` : ''}`, { anim: true })
  }

  return {
    productos, movimientos, cargando, ocupado, animar, filtros, ordenTabla, reloj,
    analisis, resumen, sugerencias, categorias, unificarCategoria,
    cargarTodo, guardar, deshacer, guardarProducto, eliminar, vender, llegada, retirarCaducados, borrarTodo, cargarEjemplo, importar
  }
})
