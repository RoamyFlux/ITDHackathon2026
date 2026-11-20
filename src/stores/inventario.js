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
import { DIA, hoy0, fechaISO, totalPiezas, descontar, consumirLotes, ajustarLotes, lotesDe, piezasCaducadas, crearAnalisis, claveProducto, nombreCompleto, ofertaVigente, agruparPorNombre, stockPorCategoria } from '../logica/inventario.js'
import { generarSugerencias } from '../logica/sugerencias.js'
import { cambiosPara } from '../logica/excel.js'
import { dinero, norm, plural } from '../logica/formato.js'

/* Tienda de ejemplo. Cada fila: nombre, presentación, sabor, categoría, paquetes, piezas por paquete, sueltas,
 * mínimo (paq), objetivo (paq), costo, precio y ventas de cada uno de los últimos 7 días.
 * El Refresco viene en 2 presentaciones y 2 sabores para mostrar cómo se agrupan en una sola tarjeta. */
const EJEMPLO = [
  ['Refresco', '600 ml', 'Cola', 'Bebidas', 1, 12, 3, 1.5, 5, 11, 16, [9, 8, 10, 7, 9, 11, 8]],
  ['Refresco', '600 ml', 'Naranja', 'Bebidas', 2, 12, 5, 1, 3, 11, 16, [3, 2, 4, 2, 3, 3, 2]],
  ['Refresco', '2 L', 'Cola', 'Bebidas', 3, 8, 2, 1, 3, 24, 34, [2, 3, 2, 3, 2, 4, 3]],
  ['Galletas Marías', '', '', 'Botanas', 6, 10, 2, 1, 4, 6, 10, [2, 3, 1, 2, 2, 3, 2]],
  ['Leche', '1 L', 'Entera', 'Lácteos', 2, 12, 0, 2, 4, 19, 25, [6, 7, 5, 6, 8, 7, 6]],
  ['Leche', '1 L', 'Deslactosada', 'Lácteos', 1, 12, 4, 1, 3, 22, 29, [2, 2, 3, 2, 2, 3, 2]],
  ['Huevo', 'Cartón 30', '', 'Básicos', 4, 6, 2, 1, 3, 95, 120, [1, 1, 2, 1, 1, 2, 1]],
  ['Arroz', '1 kg', '', 'Básicos', 3, 10, 5, 1, 3, 22, 29, [1, 2, 1, 1, 2, 1, 1]],
  ['Jabón de barra', '', '', 'Limpieza', 0, 20, 4, 0.5, 2, 8, 12, [1, 0, 1, 1, 0, 1, 1]],
  ['Papel higiénico', '4 rollos', '', 'Limpieza', 5, 12, 0, 1, 3, 28, 38, [2, 2, 3, 2, 2, 3, 2]],
  ['Sopa instantánea', '', 'Pollo', 'Botanas', 1, 24, 6, 1, 3, 9, 14, [4, 5, 4, 6, 5, 5, 4]],
  ['Yogur bebible', '250 ml', 'Fresa', 'Lácteos', 3, 8, 0, 1, 3, 9, 14, [2, 1, 2, 2, 1, 2, 2]],
  ['Atún en lata', '140 g', '', 'Básicos', 12, 12, 0, 1, 3, 17, 24, [0, 0, 0, 0, 0, 0, 0]]
]
// Lotes de ejemplo por "nombre|presentación|sabor": [piezas, días para caducar]. Negativo = ya caducó.
const CAD_EJEMPLO = { 'Leche|1 L|Entera': [[10, 3], [14, 20]], 'Galletas Marías||': [[20, -2], [42, 60]], 'Huevo|Cartón 30|': [[26, 5]], 'Sopa instantánea||Pollo': [[30, 120]], 'Yogur bebible|250 ml|Fresa': [[24, 2]] }

export const useInventario = defineStore('inventario', () => {
  const sesion = useSesion()
  const avisos = useAvisos()
  const prefsStore = usePreferencias()

  const productos = shallowRef([])
  const movimientos = shallowRef([])
  const ofertas = shallowRef([]) // {id, pid, tipo, valor, termina, nota}
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
  // Ofertas vigentes por producto (las vencidas se ocultan solas).
  const ofertaDe = computed(() => new Map(ofertas.value.filter(o => ofertaVigente(o, reloj.value)).map(o => [o.pid, o])))
  const sugerencias = computed(() => generarSugerencias(productos.value, analisis.value, { conOferta: new Set(ofertaDe.value.keys()) }))
  const grupos = computed(() => agruparPorNombre(productos.value))
  const porCategoria = computed(() => stockPorCategoria(productos.value, p => analisis.value.estado(p)))
  // Índice "nombre|presentación|sabor" -> producto, para no crear duplicados.
  const porClave = computed(() => new Map(productos.value.map(p => [claveProducto(p), p])))
  const buscarIgual = datos => porClave.value.get(claveProducto(datos)) || null
  // Presentaciones y sabores ya usados con ese nombre (sugerencias al escribir).
  const variantesDe = nombre => productos.value.filter(p => norm(p.nombre.trim()) === norm(String(nombre || '').trim()))
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
    ofertas.value = (r.ofertas || []).map(o => ({ id: o.id, pid: o.producto_id, tipo: o.tipo, valor: Number(o.valor), termina: o.termina, nota: o.nota || '' }))
    reloj.value = Date.now()
  }
  async function cargarInicial () {
    cargando.value = true
    try { await cargarTodo() } catch (e) {
      const m = (e && e.message) || 'revisa tu conexión'
      avisos.avisar('No se pudieron cargar tus datos: ' + m + (/does not exist|column|schema cache|relation/i.test(m) ? '. Actualiza la base: ejecuta de nuevo supabase/schema.sql en Supabase.' : ''))
    }
    cargando.value = false
    animar.value = true
  }
  // Al entrar o salir se limpia todo (otro usuario no debe ver lo del anterior).
  // immediate: si ya había sesión cuando se crea este store (por ejemplo, justo después de entrar), carga de una vez.
  watch(() => sesion.almacen, a => {
    productos.value = []; movimientos.value = []; ofertas.value = []
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

  /* ---- Productos ----
   * NUEVO: si ya existe uno con el mismo nombre, presentación y sabor, NO se crea otro: se SUMAN sus piezas al
   * existente (como una llegada de mercancía, con su lote si trae caducidad) y queda en el historial.
   * EDITAR: si al cambiar nombre/presentación/sabor queda igual a OTRO producto, se avisa y no se guarda. */
  function guardarProducto (id, data, cad) {
    const igual = buscarIgual(data)
    if (id && igual && igual.id !== id) {
      avisos.avisar(`Ya existe "${nombreCompleto(igual)}". Cambia la presentación o el sabor, o edita ese producto.`)
      return Promise.resolve(false)
    }
    if (!id && igual) return sumarAExistente(igual, data, cad)
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
    }, id ? 'Producto actualizado' : `"${nombreCompleto(data)}" agregado al inventario`)
  }
  // Suma las piezas de un producto "nuevo" repetido al que ya existe (se puede deshacer).
  function sumarAExistente (p0, data, cad) {
    const piezas = totalPiezas(data)
    const reg = nuevoRegistro()
    return guardar(async () => {
      const p = copia(p0.id)
      reg.fotos.push(fotoProducto(p))
      if (piezas > 0) {
        // Todo se lleva a piezas y se reparte con las piezas por paquete del producto existente.
        const suma = totalPiezas(p) + piezas
        await db().actualizarProducto(p.id, { paquetes: Math.floor(suma / p.porPaquete), sueltas: suma % p.porPaquete })
        if (cad) await db().insertarLotes([{ producto_id: p.id, piezas, caducidad: cad }])
        reg.movs.push(await db().insertarMovimiento({ producto_id: p.id, tipo: 'entrada', piezas }))
      }
    }, piezas > 0 ? `"${nombreCompleto(p0)}" ya existía: se sumaron ${plural(piezas, 'pieza')}` : `"${nombreCompleto(p0)}" ya existe en tu inventario`, { reg })
  }

  /* ---- Ofertas ----
   * oferta = {tipo:'porcentaje'|'dos_por_uno'|'precio', valor, termina, nota}. Una por producto: guardar otra la reemplaza. */
  function crearOferta (p, o) {
    return guardar(() => db().guardarOferta({ producto_id: p.id, tipo: o.tipo, valor: o.tipo === 'dos_por_uno' ? 50 : o.valor, termina: o.termina || null, nota: String(o.nota || '').slice(0, 120) }),
      `Oferta activa: ${nombreCompleto(p)}`)
  }
  async function quitarOferta (o) {
    const p = productos.value.find(x => x.id === o.pid)
    const ok = await avisos.confirmar({ titulo: '¿Quitar esta oferta?', mensaje: `${p ? nombreCompleto(p) : 'El producto'} vuelve a su precio normal.`, boton: 'Quitar oferta', peligro: false })
    if (ok) guardar(() => db().borrarOferta(o.id), 'Oferta quitada')
  }

  async function eliminar (p) {
    const ok = await avisos.confirmar({ titulo: `¿Eliminar "${nombreCompleto(p)}"?`, mensaje: 'También se borrarán sus lotes y su historial de ventas.', boton: 'Eliminar' })
    if (ok) guardar(() => db().borrarProducto(p.id), 'Producto eliminado')
  }

  /* ---- Venta ----
   * Descuenta piezas (abre paquetes si hace falta), gasta primero el lote que caduca antes y guarda "salida". */
  function vender (id, n) {
    const reg = nuevoRegistro()
    const nombre = nombreCompleto(productos.value.find(x => x.id === id) || { nombre: '' })
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
    }, `Llegada registrada: ${nombreCompleto(p0)} · ${detalle}`, { reg })
  }

  /* ---- Retirar caducados (merma) ----
   * Quita del inventario las piezas de lotes ya caducados y lo registra como "merma" (no cuenta como venta). */
  async function retirarCaducados (lista = productos.value) {
    const items = lista.map(p => ({ p, n: Math.min(piezasCaducadas(p), totalPiezas(p)) })).filter(x => x.n > 0)
    if (!items.length) return avisos.avisar('No hay productos caducados para retirar.', 'ok')
    const piezas = items.reduce((a, x) => a + x.n, 0)
    const costo = items.reduce((a, x) => a + x.n * (x.p.costo || 0), 0)
    const ok = await avisos.confirmar({
      titulo: items.length === 1 ? `¿Retirar lo caducado de "${nombreCompleto(items[0].p)}"?` : `¿Retirar lo caducado de ${items.length} productos?`,
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
      const nuevos = await db().insertarProductos(EJEMPLO.map(d => ({ nombre: d[0], presentacion: d[1], sabor: d[2], categoria: d[3], paquetes: d[4], por_paquete: d[5], sueltas: d[6], minimo: d[7], objetivo: d[8], costo: d[9], precio: d[10] })))
      const idDe = Object.fromEntries(nuevos.map(r => [`${r.nombre}|${r.presentacion}|${r.sabor}`, r.id]))
      const lotes = []
      const movs = []
      const ahora = Date.now()
      EJEMPLO.forEach(d => {
        const k = `${d[0]}|${d[1]}|${d[2]}`
        ;(CAD_EJEMPLO[k] || []).forEach(([piezas, dias]) => lotes.push({ producto_id: idDe[k], piezas, caducidad: fechaISO(hoy0() + dias * DIA) }))
        d[11].forEach((v, i) => { if (v > 0) movs.push({ producto_id: idDe[k], tipo: 'salida', piezas: v, created_at: new Date(ahora - (i + 0.5) * DIA).toISOString() }) })
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
    const sumados = res.filter(x => x.accion === 'sumado').length
    const omit = res.length - nuevos.length - act.length - sumados
    return guardar(async () => {
      for (let i = 0; i < nuevos.length; i += 200) {
        const bloque = nuevos.slice(i, i + 200)
        const creados = await db().insertarProductos(bloque.map(x => aDB(x.vista)))
        const idDe = new Map(creados.map(r => [claveProducto(deDB(r)), r.id]))
        await db().insertarLotes(bloque.filter(x => x.cad && totalPiezas(x.vista) > 0 && idDe.has(claveProducto(x.vista)))
          .map(x => ({ producto_id: idDe.get(claveProducto(x.vista)), piezas: totalPiezas(x.vista), caducidad: x.cad })))
      }
      const cambiados = act.map(x => {
        const p = copia(x.p.id)
        if (!p) return null
        const antes = fotoLotes(p)
        Object.assign(p, cambiosPara(x, p, x.modo))
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
    }, `Importación lista: ${plural(nuevos.length, 'nuevo')}, ${plural(act.length, 'actualizado')}${sumados ? `, ${plural(sumados, 'repetido sumado', 'repetidos sumados')}` : ''}${omit ? `, ${plural(omit, 'omitido')}` : ''}`, { anim: true })
  }

  return {
    productos, movimientos, ofertas, ofertaDe, grupos, porCategoria, buscarIgual, variantesDe, crearOferta, quitarOferta, cargando, ocupado, animar, filtros, ordenTabla, reloj,
    analisis, resumen, sugerencias, categorias, unificarCategoria,
    cargarTodo, guardar, deshacer, guardarProducto, eliminar, vender, llegada, retirarCaducados, borrarTodo, cargarEjemplo, importar
  }
})
