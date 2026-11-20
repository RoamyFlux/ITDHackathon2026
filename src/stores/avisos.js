/* =====================================================================
 * AVISOS Y CONFIRMACIONES
 * avisar(texto, tipo, accion) -> notificación flotante (toast). tipo 'ok' (verde) o 'error' (rojo).
 *   accion = {texto, fn} agrega un botón (ej. "Deshacer"); en ese caso dura 8 s en lugar de 4.5 s.
 * confirmar({titulo, mensaje, boton, peligro}) -> abre la ventana de confirmación y devuelve una promesa:
 *   true si se eligió el botón principal, false si se canceló.
 * ===================================================================== */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAvisos = defineStore('avisos', () => {
  const aviso = ref(null) // {id, texto, tipo, accion}
  const confirmacion = ref(null) // {titulo, mensaje, boton, peligro, resolver}
  let temporizador = null

  function avisar (texto, tipo = 'error', accion = null) {
    clearTimeout(temporizador)
    aviso.value = { id: Date.now(), texto, tipo, accion }
    temporizador = setTimeout(() => { aviso.value = null }, accion ? 8000 : 4500)
  }
  const cerrarAviso = () => { aviso.value = null }

  function confirmar ({ titulo, mensaje, boton = 'Confirmar', peligro = true }) {
    return new Promise(resolver => { confirmacion.value = { titulo, mensaje, boton, peligro, resolver } })
  }
  function responder (si) {
    const c = confirmacion.value
    confirmacion.value = null
    if (c) c.resolver(si)
  }

  return { aviso, confirmacion, avisar, cerrarAviso, confirmar, responder }
})
