<!--
  LISTA DE COMPRAS
  Todo producto que no esté en verde por cantidad, con los paquetes a pedir para llegar al objetivo.
  En pantalla hasta 15 renglones; copiar, WhatsApp e imprimir llevan la lista COMPLETA.
-->
<script setup>
import { computed, ref, nextTick } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useSesion } from '../stores/sesion.js'
import { useAvisos } from '../stores/avisos.js'
import Icono from './Icono.vue'

const inv = useInventario()
const sesion = useSesion()
const avisos = useAvisos()
const compras = computed(() => inv.analisis.compras())
const imprimiendo = ref(false)
const visibles = computed(() => (imprimiendo.value ? compras.value : compras.value.slice(0, 15)))

// Texto simple para copiar o mandar por WhatsApp (los * ponen el título en negritas en WhatsApp).
function texto () {
  if (!compras.value.length) return 'No hace falta comprar nada.'
  return `*Lista de compras${sesion.perfil.negocio ? ' · ' + sesion.perfil.negocio : ''}*\n` +
    compras.value.map(x => `• ${x.p.nombre}: ${x.paq} paq. (${x.paq * x.p.porPaquete} pzas)`).join('\n')
}
async function copiar () {
  try { await navigator.clipboard.writeText(texto()); avisos.avisar('Lista copiada al portapapeles', 'ok') } catch (e) { avisos.avisar('No se pudo copiar. Usa el botón de WhatsApp o imprime la lista.') }
}
const whatsapp = () => window.open('https://wa.me/?text=' + encodeURIComponent(texto()), '_blank', 'noopener,noreferrer')
async function imprimir () { imprimiendo.value = true; await nextTick(); window.print(); imprimiendo.value = false }
</script>

<template>
  <section id="compras" class="card compras">
    <div class="sec-tit"><h2><Icono n="cart" />Lista de compras</h2><span class="contador">{{ compras.length }}</span></div>
    <ul v-if="compras.length">
      <li v-for="c in visibles" :key="c.p.id"><span class="prodc"><span class="dot" :class="inv.analisis.estado(c.p)" /><b>{{ c.p.nombre }}</b></span><span class="cant">{{ c.paq }} paq. · {{ c.paq * c.p.porPaquete }} pzas</span></li>
      <li v-if="!imprimiendo && compras.length > 15" class="mas-compras"><small>y {{ compras.length - 15 }} más (se incluyen al copiar, enviar o imprimir)</small></li>
    </ul>
    <div v-else class="vacio-mini"><Icono n="check" />No hace falta comprar nada por ahora.</div>
    <div class="acciones noprint">
      <button type="button" class="sec sm" @click="copiar"><Icono n="copy" sm />Copiar</button>
      <button type="button" class="sm" @click="whatsapp"><Icono n="chat" sm />WhatsApp</button>
      <button type="button" class="sec sm icono" aria-label="Imprimir" title="Imprimir" @click="imprimir"><Icono n="print" sm /></button>
    </div>
  </section>
</template>
