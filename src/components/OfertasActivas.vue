<!--
  OFERTAS ACTIVAS
  Las ofertas que el usuario puso (y que no han vencido), con su precio de oferta y fecha de fin.
  "Cambiar" abre la ventana de la oferta; "Quitar" la elimina y el producto vuelve a su precio normal.
-->
<script setup>
import { computed } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { nombreCompleto, etiquetaOferta, precioConOferta } from '../logica/inventario.js'
import { dinero, fechaCorta } from '../logica/formato.js'
import Icono from './Icono.vue'

const inv = useInventario()
const ui = useUI()
const lista = computed(() => [...inv.ofertaDe.values()].map(o => ({ o, p: inv.productos.find(x => x.id === o.pid) })).filter(x => x.p))
</script>

<template>
  <section v-if="inv.productos.length" id="ofertas" class="card ofertas">
    <div class="sec-tit"><h2><Icono n="gift" />Ofertas activas</h2><span class="contador">{{ lista.length }}</span></div>
    <ul v-if="lista.length">
      <li v-for="{ o, p } in lista" :key="o.id">
        <span class="of-eti">{{ etiquetaOferta(o) }}</span>
        <span class="of-txt"><b>{{ nombreCompleto(p) }}</b>
          <small><template v-if="precioConOferta(p.precio, o) != null">{{ dinero(precioConOferta(p.precio, o)) }}{{ o.tipo === 'dos_por_uno' ? ' c/u llevando 2' : '' }} · </template>{{ o.termina ? 'hasta el ' + fechaCorta(o.termina) : 'sin fecha de fin' }}</small></span>
        <button type="button" class="ghost icono sm" :aria-label="'Cambiar oferta de ' + nombreCompleto(p)" title="Cambiar" @click="ui.abrir('oferta', { producto: p })"><Icono n="edit" sm /></button>
        <button type="button" class="ghost icono sm" :aria-label="'Quitar oferta de ' + nombreCompleto(p)" title="Quitar oferta" @click="inv.quitarOferta(o)"><Icono n="x" sm /></button>
      </li>
    </ul>
    <p v-else class="vacio-mini sin-icono">Sin ofertas. Usa el botón <Icono n="gift" sm /> de un producto para poner una.</p>
  </section>
</template>
