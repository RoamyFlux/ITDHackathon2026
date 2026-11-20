<!--
  VENTAS DE LA SEMANA
  Barras: piezas vendidas por día (7 días, la de hoy resaltada). Debajo: promedio diario, vendido aprox. en
  dinero (si los productos tienen precio), el más vendido y la merma (lo retirado por caducidad).
-->
<script setup>
import { computed } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { hoy0, DIA, nombreCompleto } from '../logica/inventario.js'
import { dinero } from '../logica/formato.js'
import Icono from './Icono.vue'

const inv = useInventario()
const a = computed(() => inv.analisis)
const v = computed(() => a.value.ventasDe().dias)
const max = computed(() => Math.max(1, ...v.value))
const total = computed(() => v.value.reduce((x, y) => x + y, 0))
const nombreDia = i => (i === 6 ? 'Hoy' : new Date(hoy0(inv.reloj) - (6 - i) * DIA).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''))
const extra = computed(() => {
  let vendido = 0
  let mermaPz = 0
  let mermaCosto = 0
  let top = null
  for (const p of inv.productos) {
    const x = a.value.ventasDe(p.id)
    vendido += x.suma * (p.precio || 0)
    mermaPz += x.merma
    mermaCosto += x.merma * (p.costo || 0)
    if (x.suma > 0 && (!top || x.suma > top.n)) top = { p, n: x.suma }
  }
  return { vendido, mermaPz, mermaCosto, top }
})
</script>

<template>
  <section id="ventas" class="card ventas">
    <div class="sec-tit"><h2><Icono n="chart" />Ventas · 7 días</h2><span class="contador">{{ total }} pzas</span></div>
    <div class="grafica" :class="{ anim: inv.animar }" role="img" :aria-label="'Piezas vendidas por día en los últimos 7 días: ' + v.join(', ')">
      <div v-for="(n, i) in v" :key="i" class="col" :title="`${nombreDia(i)}: ${n} piezas vendidas`">
        <em>{{ n || '' }}</em>
        <div class="area"><div class="barra" :class="{ hoy: i === 6 }" :style="{ height: Math.max(3, n / max * 100) + '%', '--i': i }" /></div>
        <span>{{ nombreDia(i) }}</span>
      </div>
    </div>
    <div class="ventas-pie">
      <div><span>Promedio diario</span><b>{{ (total / 7).toFixed(1) }} pzas</b></div>
      <div v-if="extra.vendido"><span>Vendido (aprox.)</span><b>{{ dinero(extra.vendido) }}</b></div>
      <div><span>Más vendido</span><b>{{ extra.top ? `${nombreCompleto(extra.top.p)} · ${extra.top.n} pzas` : '—' }}</b></div>
      <div v-if="extra.mermaPz" class="merma"><span>Merma por caducidad</span><b>{{ extra.mermaPz }} pzas<template v-if="extra.mermaCosto"> · {{ dinero(extra.mermaCosto) }}</template></b></div>
    </div>
  </section>
</template>
