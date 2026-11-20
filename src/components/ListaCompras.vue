<!--
  LISTA DE COMPRAS
  Todo producto que no esté en verde por cantidad, con los paquetes a pedir para llegar al objetivo.
  En pantalla hasta 15 renglones; copiar e imprimir llevan la lista COMPLETA.
-->
<script setup>
import { computed, ref, nextTick } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useSesion } from '../stores/sesion.js'
import { useAvisos } from '../stores/avisos.js'
import Icono from './Icono.vue'
import { nombreCompleto } from '../logica/inventario.js'

const inv = useInventario()
const sesion = useSesion()
const avisos = useAvisos()
const compras = computed(() => inv.analisis.compras())
const imprimiendo = ref(false)
const visibles = computed(() => (imprimiendo.value ? compras.value : compras.value.slice(0, 15)))

// Texto simple para copiar (pegarlo en un mensaje, nota o correo para el proveedor).
function texto () {
  if (!compras.value.length) return 'No hace falta comprar nada.'
  return `Lista de compras${sesion.perfil.negocio ? ' · ' + sesion.perfil.negocio : ''}\n` +
    compras.value.map(x => `• ${nombreCompleto(x.p)}: ${x.paq} paq. (${x.paq * x.p.porPaquete} pzas)`).join('\n')
}
async function copiar () {
  try { await navigator.clipboard.writeText(texto()); avisos.avisar('Lista copiada al portapapeles', 'ok') } catch (e) { avisos.avisar('No se pudo copiar. Imprime la lista o selecciónala a mano.') }
}
async function imprimir () { imprimiendo.value = true; await nextTick(); window.print(); imprimiendo.value = false }
</script>

<template>
  <section id="compras" class="card compras">
    <div class="sec-tit"><h2><Icono n="cart" />Lista de compras</h2><span class="contador">{{ compras.length }}</span></div>
    <ul v-if="compras.length">
      <li v-for="c in visibles" :key="c.p.id"><span class="prodc"><span class="dot" :class="inv.analisis.estado(c.p)" /><b>{{ nombreCompleto(c.p) }}</b></span><span class="cant">{{ c.paq }} paq. · {{ c.paq * c.p.porPaquete }} pzas</span></li>
      <li v-if="!imprimiendo && compras.length > 15" class="mas-compras"><small>y {{ compras.length - 15 }} más (se incluyen al copiar o imprimir)</small></li>
    </ul>
    <div v-else class="vacio-mini"><Icono n="check" />No hace falta comprar nada por ahora.</div>
    <div class="acciones noprint">
      <button type="button" class="sm" @click="copiar"><Icono n="copy" sm />Copiar lista</button>
      <button type="button" class="sec sm" @click="imprimir"><Icono n="print" sm />Imprimir</button>
    </div>
  </section>
</template>
