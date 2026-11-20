/* =====================================================================
 * ALMACÉN DE DATOS
 * La app nunca habla directo con la base de datos: usa estas operaciones pequeñas (leer, insertar,
 * actualizar, borrar). Hay dos versiones con las MISMAS operaciones:
 *   almacenSupabase -> guarda en Supabase (cuenta real). Las reglas RLS limitan cada usuario a sus filas.
 *   almacenDemo     -> guarda en memoria (modo demostración: nada sale del navegador y se borra al salir).
 * La base usa nombres con guion bajo (por_paquete) y la app camelCase (porPaquete): deDB y aDB traducen.
 * ===================================================================== */
import { sb } from './supabase.js'

// Fila de la tabla productos -> objeto de la app (los lotes se agregan después).
export const deDB = r => ({
  id: r.id, nombre: r.nombre, presentacion: r.presentacion || '', sabor: r.sabor || '', categoria: r.categoria || '', creado: Date.parse(r.created_at) || Date.now(),
  paquetes: r.paquetes, porPaquete: r.por_paquete, sueltas: r.sueltas, minimo: Number(r.minimo), objetivo: Number(r.objetivo),
  costo: r.costo == null ? null : Number(r.costo), precio: r.precio == null ? null : Number(r.precio), lotes: []
})
// Objeto de la app -> columnas (sin id ni user_id: los pone la base de datos).
export const aDB = p => ({
  nombre: p.nombre, presentacion: p.presentacion || '', sabor: p.sabor || '', categoria: p.categoria, paquetes: p.paquetes, por_paquete: p.porPaquete,
  sueltas: p.sueltas, minimo: p.minimo, objetivo: p.objetivo, costo: p.costo, precio: p.precio
})

// Cada llamada a Supabase devuelve {data, error}; si hay error se lanza para que lo atrape quien llamó.
function chk (r) { if (r.error) throw r.error; return r.data }

// Supabase entrega máximo 1000 filas por consulta: se pide de 1000 en 1000 hasta traer todas.
const PAGINA = 1000
async function leerTodo (armar) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA) {
    const data = chk(await armar().range(desde, desde + PAGINA - 1))
    filas.push(...data)
    if (data.length < PAGINA) return filas
  }
}

/* ---------------------------------------------------------------------
 * 1) SUPABASE
 * ------------------------------------------------------------------- */
export const almacenSupabase = {
  // Lee las 3 tablas (solo columnas necesarias). Movimientos: solo los últimos 8 días (el cálculo usa 7).
  async leer (desdeISO) {
    const [productos, lotes, movimientos, ofertas] = await Promise.all([
      leerTodo(() => sb.from('productos').select('id,nombre,presentacion,sabor,categoria,paquetes,por_paquete,sueltas,minimo,objetivo,costo,precio,created_at').order('created_at').order('id')),
      leerTodo(() => sb.from('lotes').select('id,producto_id,piezas,caducidad').order('id')),
      leerTodo(() => sb.from('movimientos').select('id,producto_id,tipo,piezas,created_at').gte('created_at', desdeISO).order('created_at')),
      leerTodo(() => sb.from('ofertas').select('id,producto_id,tipo,valor,termina,nota').order('created_at'))
    ])
    return { productos, lotes, movimientos, ofertas }
  },
  insertarProductos: async filas => chk(await sb.from('productos').insert(filas).select()),
  actualizarProducto: async (id, cols) => chk(await sb.from('productos').update(cols).eq('id', id)),
  upsertProductos: async filas => chk(await sb.from('productos').upsert(filas)),
  borrarProducto: async id => chk(await sb.from('productos').delete().eq('id', id)),
  // delete() exige un filtro: "created_at >= 1970" coincide con todas sus filas (RLS ya limita a las suyas).
  borrarTodo: async () => chk(await sb.from('productos').delete().gte('created_at', '1970-01-01')),
  insertarLotes: async filas => { if (filas.length) chk(await sb.from('lotes').insert(filas)) },
  actualizarLote: async (id, piezas) => chk(await sb.from('lotes').update({ piezas }).eq('id', id)),
  borrarLote: async id => chk(await sb.from('lotes').delete().eq('id', id)),
  borrarLotesDe: async ids => chk(await sb.from('lotes').delete().in('producto_id', ids)),
  insertarMovimiento: async fila => chk(await sb.from('movimientos').insert(fila).select('id').single()).id,
  insertarMovimientos: async filas => { if (filas.length) chk(await sb.from('movimientos').insert(filas)) },
  borrarMovimientos: async ids => chk(await sb.from('movimientos').delete().in('id', ids)),
  // Ofertas (una por producto: crear una nueva reemplaza la anterior).
  guardarOferta: async fila => {
    chk(await sb.from('ofertas').delete().eq('producto_id', fila.producto_id))
    chk(await sb.from('ofertas').insert(fila))
  },
  borrarOferta: async id => chk(await sb.from('ofertas').delete().eq('id', id)),
  // Bitácora de seguridad (tabla eventos_seguridad; ver schema.sql). Los borrados y retiros los anota la base sola.
  registrarEvento: async (tipo, detalle = '') => chk(await sb.from('eventos_seguridad').insert({ tipo, detalle: String(detalle).slice(0, 300) })),
  leerEventos: async () => chk(await sb.from('eventos_seguridad').select('id,tipo,detalle,created_at').order('created_at', { ascending: false }).limit(50))
}

/* ---------------------------------------------------------------------
 * 2) DEMOSTRACIÓN (en memoria)
 * Imita las mismas operaciones con arreglos. Las filas se copian al leer y al guardar para que la app
 * no pueda cambiarlas "por fuera" (igual que con una base de datos real).
 * ------------------------------------------------------------------- */
export function crearAlmacenDemo () {
  const db = { productos: [], lotes: [], movimientos: [], ofertas: [], eventos: [] }
  const id = () => crypto.randomUUID()
  const copia = x => structuredClone(x)
  const ahora = () => new Date().toISOString()
  const evento = (tipo, detalle) => db.eventos.unshift({ id: id(), tipo, detalle, created_at: ahora() })
  return {
    async leer (desdeISO) {
      return copia({ productos: db.productos, lotes: db.lotes, movimientos: db.movimientos.filter(m => m.created_at >= desdeISO), ofertas: db.ofertas })
    },
    async insertarProductos (filas) {
      const nuevas = filas.map(f => ({ id: id(), created_at: ahora(), costo: null, precio: null, ...copia(f) }))
      db.productos.push(...nuevas)
      return copia(nuevas)
    },
    async actualizarProducto (pid, cols) { Object.assign(db.productos.find(p => p.id === pid) || {}, copia(cols)) },
    async upsertProductos (filas) { filas.forEach(f => Object.assign(db.productos.find(p => p.id === f.id) || {}, copia(f))) },
    async borrarProducto (pid) {
      db.productos = db.productos.filter(p => p.id !== pid)
      db.lotes = db.lotes.filter(l => l.producto_id !== pid)
      db.movimientos = db.movimientos.filter(m => m.producto_id !== pid)
      db.ofertas = db.ofertas.filter(o => o.producto_id !== pid)
      evento('borrado', '1 producto eliminado')
    },
    async borrarTodo () {
      const n = db.productos.length
      db.productos = []; db.lotes = []; db.movimientos = []; db.ofertas = []
      if (n) evento('borrado', `${n} productos eliminados`)
    },
    async insertarLotes (filas) { db.lotes.push(...filas.map(f => ({ id: id(), ...copia(f) }))) },
    async actualizarLote (lid, piezas) { const l = db.lotes.find(x => x.id === lid); if (l) l.piezas = piezas },
    async borrarLote (lid) { db.lotes = db.lotes.filter(l => l.id !== lid) },
    async borrarLotesDe (ids) { db.lotes = db.lotes.filter(l => !ids.includes(l.producto_id)) },
    async insertarMovimiento (f) {
      const m = { id: id(), created_at: ahora(), ...copia(f) }
      db.movimientos.push(m)
      if (f.tipo === 'merma') evento('retiro', `${f.piezas} piezas caducadas retiradas`)
      return m.id
    },
    async insertarMovimientos (filas) { db.movimientos.push(...filas.map(f => ({ id: id(), created_at: ahora(), ...copia(f) }))) },
    async borrarMovimientos (ids) { db.movimientos = db.movimientos.filter(m => !ids.includes(m.id)) },
    async guardarOferta (f) { db.ofertas = db.ofertas.filter(o => o.producto_id !== f.producto_id); db.ofertas.push({ id: id(), ...copia(f) }) },
    async borrarOferta (oid) { db.ofertas = db.ofertas.filter(o => o.id !== oid) },
    async registrarEvento (tipo, detalle = '') { evento(tipo, String(detalle).slice(0, 300)) },
    async leerEventos () { return copia(db.eventos.slice(0, 50)) }
  }
}
