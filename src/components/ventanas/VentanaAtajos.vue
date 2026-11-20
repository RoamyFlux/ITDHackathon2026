<!-- ATAJOS DE TECLADO -->
<script setup>
import Ventana from '../Ventana.vue'
const emit = defineEmits(['cerrar'])
const ATAJOS = [[['Ctrl', 'K'], 'Buscar o ejecutar cualquier cosa'], [['N'], 'Nuevo producto'], [['/'], 'Ir al buscador del inventario'], [['?'], 'Ver estos atajos'], [['Esc'], 'Cerrar ventanas']]
</script>

<template>
  <Ventana titulo="Atajos de teclado" icono="keyboard" ancho="sm" @cerrar="emit('cerrar')">
    <ul class="atajos">
      <li v-for="[teclas, t] in ATAJOS" :key="t"><span>{{ t }}</span><span><kbd v-for="k in teclas" :key="k">{{ k }}</kbd></span></li>
    </ul>
  </Ventana>
</template>
