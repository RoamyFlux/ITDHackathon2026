<!--
  BLOQUE PLEGABLE (reutilizable)
  Se abre y se cierra tocando su título (usa <details>/<summary> del navegador: funciona con teclado y lector de
  pantalla). Si se le da "recordar", guarda en este dispositivo si quedó abierto o cerrado.
  Uso: <Plegable titulo="Apariencia" icono="palette" abierto recordar="config-apariencia"> … </Plegable>
-->
<script setup>
import { ref } from 'vue'
import Icono from './Icono.vue'

const props = defineProps({ titulo: String, icono: String, abierto: Boolean, recordar: String, resumen: String, clase: String })
const clave = props.recordar ? 'earlystock.plegable.' + props.recordar : null
const leer = () => { try { const v = localStorage.getItem(clave); return v === null ? props.abierto : v === '1' } catch (e) { return props.abierto } }
const abiertoAhora = ref(clave ? leer() : props.abierto)
function alCambiar (e) {
  abiertoAhora.value = e.target.open
  if (clave) try { localStorage.setItem(clave, e.target.open ? '1' : '0') } catch (_) {}
}
</script>

<template>
  <details class="plegable" :class="clase" :open="abiertoAhora" @toggle="alCambiar">
    <summary>
      <Icono v-if="icono" :n="icono" sm />
      <span class="pl-tit">{{ titulo }}<small v-if="resumen">{{ resumen }}</small></span>
      <slot name="extra" />
      <Icono n="dn" sm class="pl-flecha" />
    </summary>
    <div class="pl-cuerpo"><slot /></div>
  </details>
</template>
