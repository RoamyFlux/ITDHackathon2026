<!--
  PESTAÑAS (reutilizable)
  Barra de pestañas accesible (patrón tablist/tab/tabpanel):
    - Flechas ← → para moverse; Inicio y Fin van a la primera y a la última.
    - Cada pestaña tiene id "<prefijo>-tab-<id>" y apunta (aria-controls) a su panel "<prefijo>-panel-<id>"
      (o al id que diga la opción "panel"). Quien la usa pone ese id en el panel y aria-labelledby="<prefijo>-tab-<id>"
      (helper: idsPestana()).
    - Contador opcional con texto para lector de pantalla (por ejemplo "3 urgentes").
  Uso: <Pestanas v-model="actual" prefijo="panel" :opciones="[{ id: 'hoy', t: 'Hoy', icono: 'spark', n: 3, nTxt: 'urgentes', alerta: true }]" />
-->
<script>
// Ids del panel de una pestaña, para ponerlos en el contenido: v-bind="idsPestana('panel', 'hoy')".
export const idsPestana = (prefijo, id) => ({ id: `${prefijo}-panel-${id}`, role: 'tabpanel', 'aria-labelledby': `${prefijo}-tab-${id}`, tabindex: '-1' })
</script>

<script setup>
import { ref } from 'vue'
import Icono from './Icono.vue'

const props = defineProps({ modelValue: String, opciones: { type: Array, required: true }, etiqueta: String, prefijo: { type: String, default: 'pst' } })
const emit = defineEmits(['update:modelValue'])
const barra = ref(null)
const elegir = id => emit('update:modelValue', id)
function tecla (e) {
  const n = props.opciones.length
  const i = props.opciones.findIndex(o => o.id === props.modelValue)
  const j = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key]
  if (j === undefined) return
  e.preventDefault()
  elegir(props.opciones[j].id)
  barra.value.querySelectorAll('[role=tab]')[j]?.focus()
}
</script>

<template>
  <div ref="barra" class="pestanas-barra" role="tablist" :aria-label="etiqueta" @keydown="tecla">
    <button v-for="o in opciones" :id="`${prefijo}-tab-${o.id}`" :key="o.id" type="button" role="tab" class="pestana" :class="{ activa: modelValue === o.id }"
            :aria-selected="modelValue === o.id" :aria-controls="o.panel || `${prefijo}-panel-${o.id}`" :tabindex="modelValue === o.id ? 0 : -1" :data-pestana="o.id" @click="elegir(o.id)">
      <Icono v-if="o.icono" :n="o.icono" sm />
      <span class="p-txt">{{ o.t }}</span>
      <span v-if="o.n" class="p-n" :class="{ alerta: o.alerta }"><span aria-hidden="true">{{ o.n > 99 ? '99+' : o.n }}</span><span class="sr">{{ o.n }} {{ o.nTxt || '' }}</span></span>
    </button>
  </div>
</template>
