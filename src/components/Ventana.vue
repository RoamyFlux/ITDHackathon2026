<!--
  VENTANA EMERGENTE (base para todas)
  Usa <dialog> del navegador: bloquea el fondo, se cierra con Esc y atrapa el foco del teclado.
  Props: titulo, subtitulo, icono, ancho ('sm' | 'md' | 'xl' | 'cmd'), sinCabecera, etiqueta. Emite "cerrar".
  - Tocar el fondo oscuro la cierra, pero SOLO si el clic empezó y terminó en el fondo (si seleccionas texto de un
    campo y sueltas el mouse afuera, no se pierde lo que escribiste).
  - Al cerrarse, el foco regresa al botón que la abrió (importante para teclado y lector de pantalla).
  - Nombre accesible: el título (aria-labelledby) o "etiqueta" si no tiene cabecera.
-->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Icono from './Icono.vue'

defineProps({ titulo: String, subtitulo: String, icono: String, ancho: { type: String, default: 'md' }, sinCabecera: Boolean, etiqueta: String })
const emit = defineEmits(['cerrar'])
const dlg = ref(null)
const idTitulo = 'vt-' + Math.random().toString(36).slice(2, 8)
let antes = null

onMounted(() => { antes = document.activeElement; dlg.value.showModal() })
onBeforeUnmount(() => {
  try { dlg.value && dlg.value.open && dlg.value.close() } catch (e) {}
  // Devolver el foco a donde estaba (si ese botón sigue en la página).
  if (antes && antes.isConnected && typeof antes.focus === 'function') setTimeout(() => antes.focus({ preventScroll: true }), 0)
})
// Esc dispara "cancel": se avisa al padre en lugar de dejar que el navegador la cierre por su cuenta.
function cancelar (e) { e.preventDefault(); emit('cerrar') }
let downEnFondo = false
function presionar (e) { downEnFondo = e.target === dlg.value }
function clicFondo (e) { if (downEnFondo && e.target === dlg.value) emit('cerrar'); downEnFondo = false }
</script>

<template>
  <dialog ref="dlg" class="ventana" :class="'v-' + ancho" :aria-labelledby="sinCabecera ? undefined : idTitulo" :aria-label="sinCabecera ? (etiqueta || titulo) : undefined"
          @cancel="cancelar" @mousedown="presionar" @click="clicFondo">
    <div class="ventana-in">
      <div v-if="!sinCabecera" class="dlg-cab">
        <span v-if="icono" class="ico-dlg"><Icono :n="icono" /></span>
        <h2 :id="idTitulo">{{ titulo }}<small v-if="subtitulo">{{ subtitulo }}</small></h2>
        <button type="button" class="ghost icono" aria-label="Cerrar" title="Cerrar" @click="emit('cerrar')"><Icono n="x" /></button>
      </div>
      <slot />
    </div>
  </dialog>
</template>
