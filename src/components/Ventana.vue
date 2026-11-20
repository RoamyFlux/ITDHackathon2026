<!--
  VENTANA EMERGENTE (base para todas)
  Usa <dialog> del navegador: bloquea el fondo, se cierra con Esc y atrapa el foco del teclado.
  Props: titulo, subtitulo, icono, ancho ('sm' | 'md' | 'lg' | 'xl'). Emite "cerrar".
  Tocar el fondo oscuro (fuera de la ventana) también la cierra.
-->
<script setup>
import { ref, onMounted } from 'vue'
import Icono from './Icono.vue'

defineProps({ titulo: String, subtitulo: String, icono: String, ancho: { type: String, default: 'md' }, sinCabecera: Boolean })
const emit = defineEmits(['cerrar'])
const dlg = ref(null)

onMounted(() => { dlg.value.showModal() })
// Esc dispara "cancel": se avisa al padre en lugar de dejar que el navegador la cierre por su cuenta.
function cancelar (e) { e.preventDefault(); emit('cerrar') }
function clicFondo (e) { if (e.target === dlg.value) emit('cerrar') }
</script>

<template>
  <dialog ref="dlg" class="ventana" :class="'v-' + ancho" @cancel="cancelar" @click="clicFondo">
    <div class="ventana-in">
      <div v-if="!sinCabecera" class="dlg-cab">
        <span v-if="icono" class="ico-dlg"><Icono :n="icono" /></span>
        <h2>{{ titulo }}<small v-if="subtitulo">{{ subtitulo }}</small></h2>
        <button type="button" class="ghost icono" aria-label="Cerrar" title="Cerrar" @click="emit('cerrar')"><Icono n="x" /></button>
      </div>
      <slot />
    </div>
  </dialog>
</template>
