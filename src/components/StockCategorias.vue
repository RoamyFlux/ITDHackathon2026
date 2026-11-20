<!--
  STOCK POR CATEGORÍA
  Barra por categoría con sus piezas totales (todas las presentaciones y sabores), cuántos productos tiene y
  cuántas variantes requieren atención. Tocar una categoría filtra el inventario.
-->
<script setup>
import { computed } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { plural } from '../logica/formato.js'
import Icono from './Icono.vue'

const inv = useInventario()
const ui = useUI()
const max = computed(() => Math.max(1, ...inv.porCategoria.map(c => c.piezas)))
const total = computed(() => inv.porCategoria.reduce((a, c) => a + c.piezas, 0))
function filtrar (c) { inv.filtros = { q: '', estado: '', categoria: c }; ui.irA('inventario') }
</script>

<template>
  <section v-if="inv.productos.length" id="categorias" class="card categorias">
    <div class="sec-tit"><h2><Icono n="layers" />Stock por categoría</h2><span class="contador">{{ total }} pzas</span></div>
    <ul>
      <li v-for="c in inv.porCategoria" :key="c.categoria">
        <button type="button" class="cat-fila" :title="'Ver ' + c.categoria" @click="filtrar(c.categoria)">
          <span class="cat-txt"><b>{{ c.categoria }}</b><small>{{ plural(c.productos, 'producto') }}<template v-if="c.variantes > c.productos"> · {{ plural(c.variantes, 'variante') }}</template><template v-if="c.enRiesgo"> · <em>{{ c.enRiesgo }} en riesgo</em></template></small></span>
          <span class="cat-num">{{ c.piezas }} <small>pzas</small></span>
          <span class="cat-barra"><i :style="{ width: Math.max(2, c.piezas / max * 100) + '%' }" /></span>
        </button>
      </li>
    </ul>
  </section>
</template>
