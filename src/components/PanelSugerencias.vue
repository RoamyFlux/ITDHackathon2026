<!--
  PANEL "SUGERENCIAS PARA HOY"
  Muestra las ideas del motor de sugerencias (logica/sugerencias.js), las más urgentes primero, cada una con
  su botón de acción (Crear oferta, Retirar, Ver lista de compras…). Al principio se ven 3; "Ver todas" despliega el resto.
-->
<script setup>
import { ref, computed } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import Icono from './Icono.vue'
import { ICONO_SUG, BOTON_SUG, accionSugerencia } from './sugerenciaAcciones.js'

const inv = useInventario()
const ui = useUI()
const todas = ref(false)
const lista = computed(() => (todas.value ? inv.sugerencias : inv.sugerencias.slice(0, 3)))
const color = s => (s.prioridad >= 80 ? 'crit' : s.prioridad >= 60 ? 'low' : s.tipo === 'estrella' ? 'marca' : '')
</script>

<template>
  <section v-if="inv.productos.length" id="sugerencias" class="card sugerencias">
    <div class="sec-tit">
      <h2><Icono n="bulb" />Sugerencias para hoy</h2>
      <span class="contador" :class="{ crit: inv.sugerencias.some(s => s.prioridad >= 80) }">{{ inv.sugerencias.length }}</span>
    </div>
    <p v-if="!inv.sugerencias.length" class="vacio-mini"><Icono n="check" />Nada que sugerir: tu inventario va muy bien.</p>
    <TransitionGroup v-else tag="ul" name="lista" class="lista-sug">
      <li v-for="s in lista" :key="s.id" class="sug" :class="color(s)">
        <span class="ico-s"><Icono :n="ICONO_SUG[s.tipo]" /></span>
        <div class="sug-txt"><b>{{ s.titulo }}</b><p>{{ s.detalle }}</p></div>
        <button type="button" class="sm" :class="{ sec: s.prioridad < 60 }" @click="accionSugerencia(s, inv, ui)">{{ BOTON_SUG[s.tipo] }}</button>
      </li>
    </TransitionGroup>
    <button v-if="inv.sugerencias.length > 3" type="button" class="ghost sm ver-mas" @click="todas = !todas">
      <Icono :n="todas ? 'up' : 'dn'" sm />{{ todas ? 'Ver menos' : `Ver todas (${inv.sugerencias.length})` }}
    </button>
  </section>
</template>
