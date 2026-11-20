<!--
  VISTA DE TABLA
  Encabezados = botones para ordenar (tocar otra vez invierte el orden). La primera columna y los encabezados
  se quedan fijos al desplazarse. En celular la tabla se desliza de lado sin mover la página.
-->
<script setup>
import { computed } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { totalPiezas, lotesDe, diasA } from '../logica/inventario.js'
import { ETIQ, cadTxt, fechaCorta, fmt, diasCorto, plural } from '../logica/formato.js'
import Icono from './Icono.vue'
import Spark from './Spark.vue'

const props = defineProps({ filas: { type: Array, required: true }, limite: Number })
const inv = useInventario()
const ui = useUI()
const a = computed(() => inv.analisis)
const suma = arr => arr.reduce((x, y) => x + y, 0)

// Columnas ordenables: k (clave), t (título), num (alineada a la derecha), v(p) = valor para ordenar.
const COLS = [
  { k: 'nombre', t: 'Producto', v: p => p.nombre.toLowerCase() },
  { k: 'categoria', t: 'Categoría', v: p => (p.categoria || '').toLowerCase() },
  { k: 'estado', t: 'Estado', v: p => ({ crit: 0, low: 1, ok: 2 })[a.value.estadoTotal(p)] },
  { k: 'paquetes', t: 'Paquetes', num: 1, v: p => p.paquetes },
  { k: 'porPaquete', t: 'Pzas/paq', num: 1, v: p => p.porPaquete },
  { k: 'sueltas', t: 'Sueltas', num: 1, v: p => p.sueltas },
  { k: 'total', t: 'Total pzas', num: 1, v: p => totalPiezas(p) },
  { k: 'minimo', t: 'Mínimo', num: 1, v: p => p.minimo * p.porPaquete },
  { k: 'dias', t: 'Alcanza', num: 1, v: p => a.value.diasRestantes(p) ?? Infinity },
  { k: 'cad', t: 'Próx. caducidad', v: p => (lotesDe(p)[0] || {}).cad || '9999-12-31' },
  { k: 'ventas', t: 'Ventas 7 días', num: 1, v: p => suma(a.value.ventasDe(p.id).dias) }
]
function ordenar (k) {
  const o = inv.ordenTabla
  inv.ordenTabla = o.col === k ? { col: k, dir: -o.dir } : { col: k, dir: 1 }
}
// Se calcula el valor de orden UNA vez por producto y luego se ordena.
const ordenadas = computed(() => {
  const c = COLS.find(x => x.k === inv.ordenTabla.col) || COLS[2]
  return props.filas.map(p => [c.v(p), p])
    .sort(([va, x], [vb, y]) => (va < vb ? -1 : va > vb ? 1 : 0) * inv.ordenTabla.dir || x.nombre.localeCompare(y.nombre))
    .map(x => x[1])
})
const visibles = computed(() => ordenadas.value.slice(0, props.limite).map(p => {
  const l = lotesDe(p)[0]
  const d = l ? diasA(l.cad, inv.reloj) : null
  return { p, l, d, e: a.value.estadoTotal(p), es: a.value.estado(p), ec: a.value.estadoCad(p), dias: diasCorto(a.value.diasRestantes(p)), v7: suma(a.value.ventasDe(p.id).dias) }
}))
const totPz = computed(() => suma(props.filas.map(totalPiezas)))
</script>

<template>
  <div class="tabla-wrap">
    <table class="tabla" aria-label="Inventario en tabla">
      <thead>
        <tr>
          <th v-for="c in COLS" :key="c.k" :class="{ num: c.num }" :aria-sort="inv.ordenTabla.col === c.k ? (inv.ordenTabla.dir > 0 ? 'ascending' : 'descending') : null">
            <button type="button" class="orden" :title="'Ordenar por ' + c.t" @click="ordenar(c.k)">{{ c.t }}<Icono :n="inv.ordenTabla.col === c.k ? (inv.ordenTabla.dir > 0 ? 'up' : 'dn') : 'sort'" sm /></button>
          </th>
          <th class="num"><span class="th-txt">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(x, k) in visibles" :key="x.p.id" :class="x.e" :data-fila="x.p.id" :style="{ '--i': Math.min(k, 14) }">
          <td><span class="nom" :title="x.p.nombre"><span class="dot" :class="x.e" />{{ x.p.nombre }}</span></td>
          <td>{{ x.p.categoria || '—' }}</td>
          <td><span class="badge" :class="x.es">{{ ETIQ[x.es] }}</span><span v-if="x.ec !== 'ok'" class="badge cad" :class="x.ec"><Icono n="clock" sm />{{ x.ec === 'crit' ? 'Caducado' : 'Por caducar' }}</span></td>
          <td class="num">{{ x.p.paquetes }}</td><td class="num">{{ x.p.porPaquete }}</td><td class="num">{{ x.p.sueltas }}</td>
          <td class="num"><b>{{ totalPiezas(x.p) }}</b></td>
          <td class="num">{{ fmt(x.p.minimo) }} paq. <small>({{ fmt(x.p.minimo * x.p.porPaquete) }})</small></td>
          <td class="num">{{ x.dias || '—' }}<template v-if="x.dias"><br><small>≈ {{ a.consumoDiario(x.p).toFixed(1) }}/día</small></template></td>
          <td>
            <template v-if="x.l"><span class="cad-celda" :class="x.d < 0 ? 'crit' : x.d <= a.diasAviso ? 'low' : ''">{{ fechaCorta(x.l.cad) }} <small>· {{ cadTxt(x.d) }}</small></span>
              <button v-if="x.d < 0" type="button" class="lote-retirar" @click="inv.retirarCaducados([x.p])">Retirar</button></template>
            <template v-else>—</template>
          </td>
          <td class="num"><span class="ventas-celda"><Spark :dias="a.ventasDe(x.p.id).dias" /><b>{{ x.v7 }}</b></span></td>
          <td class="num"><span class="acc">
            <button type="button" class="sm icono" :aria-label="'Vendí ' + x.p.nombre" title="Vendí" @click="ui.abrir('movimiento', { tipo: 'venta', producto: x.p })"><Icono n="minus" sm /></button>
            <button type="button" class="sm sec icono" :aria-label="'Llegó ' + x.p.nombre" title="Llegó mercancía" @click="ui.abrir('movimiento', { tipo: 'llegada', producto: x.p })"><Icono n="truck" sm /></button>
            <button type="button" class="sm ghost icono" :aria-label="'Editar ' + x.p.nombre" title="Editar" @click="ui.abrir('producto', { producto: x.p })"><Icono n="edit" sm /></button>
            <button type="button" class="sm ghost icono" :aria-label="'Eliminar ' + x.p.nombre" title="Eliminar" @click="inv.eliminar(x.p)"><Icono n="trash" sm /></button>
          </span></td>
        </tr>
      </tbody>
      <tfoot><tr><td>{{ plural(filas.length, 'producto') }}</td><td colspan="5" /><td class="num">{{ totPz }} pzas</td><td colspan="6" /></tr></tfoot>
    </table>
  </div>
</template>
