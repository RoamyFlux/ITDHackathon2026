<!--
  TU PLAN (columna derecha del panel)
  Plan actual y cuántos productos lleva de su límite. Cuando pasa del 80 % la barra se pone ámbar y aparece
  la invitación al plan SIGUIENTE (Gratis -> Pro, Pro -> Max), con los números de logica/planes.js.
-->
<script setup>
import { computed } from 'vue'
import { usePlan } from '../stores/plan.js'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { limiteTxt, usoPct, PLANES } from '../logica/planes.js'
import { fechaCorta } from '../logica/formato.js'
import Icono from './Icono.vue'

const plan = usePlan()
const inv = useInventario()
const ui = useUI()
const usados = computed(() => inv.productos.length)
const pct = computed(() => usoPct(plan.planId, usados.value))
// Plan que sigue al actual (null si ya está en el más alto).
const siguiente = computed(() => PLANES[PLANES.findIndex(p => p.id === plan.planId) + 1] || null)
</script>

<template>
  <section id="tu-plan" class="card tu-plan" :class="'p-' + plan.planId">
    <div class="sec-tit"><h2><Icono n="star" />Tu plan</h2><span class="plan-chip">{{ plan.plan.nombre }}</span></div>
    <p class="uso-txt"><b>{{ usados.toLocaleString('es-MX') }}</b> de {{ limiteTxt(plan.plan.limites.productos) }} productos</p>
    <span v-if="pct !== null" class="barra-uso" :class="{ low: pct >= 80, crit: pct >= 100 }"><i :style="{ width: pct + '%' }" /></span>
    <p v-if="plan.vencido" class="pista mal">Tu plan pagado venció: volviste a Gratis.</p>
    <p v-else-if="plan.vence" class="hint">Pagado hasta el {{ fechaCorta(plan.vence) }}</p>
    <p v-if="pct !== null && pct >= 80 && siguiente" class="pista">Te queda poco espacio: con {{ siguiente.nombre }} tienes {{ siguiente.limites.productos ? 'hasta ' + limiteTxt(siguiente.limites.productos) : 'productos ilimitados' }}.</p>
    <button type="button" class="sm ancho" :class="{ sec: plan.planId === 'max' }" @click="ui.abrir('planes')"><Icono n="star" sm />{{ plan.planId === 'max' ? 'Ver planes' : 'Mejorar mi plan' }}</button>
  </section>
</template>
