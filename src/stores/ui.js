/* =====================================================================
 * VENTANAS ABIERTAS
 * Solo puede haber una ventana emergente a la vez. Cualquier parte de la app la abre con
 *   ui.abrir('producto', {producto})   ui.abrir('movimiento', {tipo:'venta', producto})   ui.cerrar()
 * App.vue dibuja la que corresponda. Tipos: producto, movimiento, perfil, seguridad, configuracion,
 * importar, contrasena, comandos, atajos, guia, oferta, notificaciones.
 * ===================================================================== */
import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'

export const useUI = defineStore('ui', () => {
  const ventana = shallowRef(null) // {tipo, datos}
  const irProducto = ref(null) // id de un producto al que hay que bajar cuando se cierre la ventana actual
  function abrir (tipo, datos = {}) { ventana.value = { tipo, datos, id: Date.now() } }
  function cerrar () { ventana.value = null }
  // Baja hasta un elemento de la página (por id) con desplazamiento suave.
  function irA (id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return { ventana, irProducto, abrir, cerrar, irA }
})
