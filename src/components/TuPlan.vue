<!--
  TU PLAN (columna derecha del panel)
  Plan actual y cuántos productos lleva de su límite. Cuando pasa del 80 % la barra se pone ámbar y aparece
  la invitación a mejorar de plan. "Ver planes" abre la ventana con las opciones.
-->
<script setup>
import { computed } from 'vue'
import { usePlan } from '../stores/plan.js'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { limiteTxt, usoPct } from '../logica/planes.js'
import { fechaCorta } from '../logica/formato.js'
import Icono from './Icono.vue'

const plan = usePlan()
const inv = useInventario()
const ui = useUI()
const usados = computed(() => inv.productos.length)
const pct = computed(() => usoPct(plan.planId, usados.value))
</script>

<template>
  <section id="tu-plan" class="card tu-plan" :class="'p-' + plan.planId">
    <div class="sec-tit"><h2><Icono n="star" />Tu plan</h2><span class="plan-chip">{{ plan.plan.nombre }}</span></div>
    <p class="uso-txt"><b>{{ usados.toLocaleString('es-MX') }}</b> de {{ limiteTxt(plan.plan.limites.productos) }} productos</p>
    <span v-if="pct !== null" class="barra-uso" :class="{ low: pct >= 80, crit: pct >= 100 }"><i :style="{ width: pct + '%' }" /></span>
    <p v-if="plan.vencido" class="pista mal">Tu plan pagado venció: volviste a Gratis.</p>
    <p v-else-if="plan.vence" class="hint">Pagado hasta el {{ fechaCorta(plan.vence) }}</p>
    <p v-if="pct !== null && pct >= 80" class="pista">Te queda poco espacio: con Pro tienes hasta 10,000 productos.</p>
    <button type="button" class="sm ancho" :class="{ sec: plan.planId === 'max' }" @click="ui.abrir('planes')"><Icono n="star" sm />{{ plan.planId === 'max' ? 'Ver planes' : 'Mejorar mi plan' }}</button>
  </section>
</template>
