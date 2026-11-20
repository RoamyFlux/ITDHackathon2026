<!-- MINI GRÁFICA (sparkline): ventas de los últimos 7 días de un producto. Vacía si no hubo ventas. -->
<script setup>
import { computed } from 'vue'
const props = defineProps({ dias: { type: Array, required: true } })
const W = 84
const H = 26
const pts = computed(() => {
  const max = Math.max(...props.dias)
  return props.dias.map((n, i) => `${(i * W / 6).toFixed(1)},${(H - 3 - (n / max) * (H - 6)).toFixed(1)}`).join(' ')
})
</script>

<template>
  <svg v-if="dias.some(Boolean)" class="spark" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="'Ventas de 7 días: ' + dias.join(', ')">
    <title>Ventas de los últimos 7 días</title>
    <polygon :points="`0,${H} ${pts} ${W},${H}`" /><polyline :points="pts" />
  </svg>
</template>
