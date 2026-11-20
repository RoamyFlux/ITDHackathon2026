<!--
  PESTAÑAS (reutilizable)
  Barra de pestañas accesible: roles tablist/tab, flechas ← → para moverse y contador opcional en cada una.
  Uso: <Pestanas v-model="actual" :opciones="[{ id: 'hoy', t: 'Hoy', icono: 'spark', n: 3, alerta: true }]" />
  El contenido de cada pestaña lo pone quien la usa (con v-if / v-show según "actual").
  variante: 'normal' (barra arriba) | 'abajo' (barra fija abajo en celular, estilo app).
-->
<script setup>
import { ref } from 'vue'
import Icono from './Icono.vue'

const props = defineProps({ modelValue: String, opciones: { type: Array, required: true }, variante: { type: String, default: 'normal' }, etiqueta: String })
const emit = defineEmits(['update:modelValue'])
const barra = ref(null)
const elegir = id => emit('update:modelValue', id)
function tecla (e) {
  const i = props.opciones.findIndex(o => o.id === props.modelValue)
  let j = i
  if (e.key === 'ArrowRight') j = (i + 1) % props.opciones.length
  else if (e.key === 'ArrowLeft') j = (i - 1 + props.opciones.length) % props.opciones.length
  else return
  e.preventDefault()
  elegir(props.opciones[j].id)
  barra.value.querySelectorAll('[role=tab]')[j]?.focus()
}
</script>

<template>
  <div ref="barra" class="pestanas-barra" :class="'v-' + variante" role="tablist" :aria-label="etiqueta" @keydown="tecla">
    <button v-for="o in opciones" :key="o.id" type="button" role="tab" class="pestana" :class="{ activa: modelValue === o.id }"
            :aria-selected="modelValue === o.id" :tabindex="modelValue === o.id ? 0 : -1" :data-pestana="o.id" @click="elegir(o.id)">
      <Icono v-if="o.icono" :n="o.icono" sm />
      <span class="p-txt">{{ o.t }}</span>
      <span v-if="o.n" class="p-n" :class="{ alerta: o.alerta }">{{ o.n > 99 ? '99+' : o.n }}</span>
    </button>
  </div>
</template>
