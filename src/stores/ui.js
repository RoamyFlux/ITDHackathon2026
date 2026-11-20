/* =====================================================================
 * VENTANAS ABIERTAS
 * Solo puede haber una ventana emergente a la vez. Cualquier parte de la app la abre con
 *   ui.abrir('producto', {producto})   ui.abrir('movimiento', {tipo:'venta', producto})   ui.cerrar()
 * También guarda la PESTAÑA del panel (Hoy, Inventario, Compras, Ofertas, Reportes, Más).
 * App.vue dibuja la ventana que corresponda. Tipos: producto, movimiento, perfil, seguridad, configuracion,
 * importar, contrasena, comandos, atajos, guia, oferta, soporte, planes.
 * ===================================================================== */
import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'

// PESTAÑAS DEL PANEL y qué bloque (id del HTML) vive en cada una. irA(id) usa esto para cambiar de pestaña
// antes de bajar hasta el bloque, así los botones como "Ver lista de compras" funcionan desde cualquier pestaña.
export const PESTANAS = ['hoy', 'inventario', 'compras', 'ofertas', 'reportes', 'mas']
const PESTANA_DE = {
  sugerencias: 'hoy', alertas: 'hoy', resumen: 'hoy',
  inventario: 'inventario',
  compras: 'compras',
  ofertas: 'ofertas',
  ventas: 'reportes', categorias: 'reportes',
  'tu-plan': 'mas', herramientas: 'mas'
}
const CLAVE_PESTANA = 'earlystock.pestana'

export const useUI = defineStore('ui', () => {
  const ventana = shallowRef(null) // {tipo, datos}
  const irProducto = ref(null) // id de un producto al que hay que bajar cuando se cierre la ventana actual
  const accesoInicial = ref('') // 'crear' -> la página de inicio abre directo "Crear cuenta" (desde la demo)
  const pestana = ref((() => { try { const v = localStorage.getItem(CLAVE_PESTANA); return PESTANAS.includes(v) ? v : 'hoy' } catch (e) { return 'hoy' } })())
  function cambiarPestana (p) {
    if (!PESTANAS.includes(p)) return
    pestana.value = p
    try { localStorage.setItem(CLAVE_PESTANA, p) } catch (e) {}
  }
  function abrir (tipo, datos = {}) { ventana.value = { tipo, datos, id: Date.now() } }
  function cerrar () { ventana.value = null }
  // Baja hasta un bloque de la página (por id), cambiando antes a su pestaña si hace falta. Lo resalta un momento.
  function irA (id) {
    const p = PESTANA_DE[id]
    const cambio = p && p !== pestana.value
    if (p) cambiarPestana(p)
    setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (cambio || id !== 'inventario') { el.classList.remove('resaltar-bloque'); void el.offsetWidth; el.classList.add('resaltar-bloque') }
    }, cambio ? 60 : 0)
  }
  return { ventana, irProducto, accesoInicial, pestana, cambiarPestana, abrir, cerrar, irA }
})
