<!--
  TARJETA DE PRODUCTO (vista "Tarjetas")
  Franja de color = estado (peor entre cantidad y caducidad). Muestra piezas totales, el equivalente en
  paquetes, cuántos días alcanza (con explicación al pasar el mouse), barra de nivel, lotes con caducidad
  y los botones Vendí / Llegó / Editar / Eliminar.
-->
<script setup>
import { computed } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { totalPiezas, lotesDe, diasA } from '../logica/inventario.js'
import { ETIQ, cadTxt, fechaCorta, fmt, diasCorto } from '../logica/formato.js'
import Icono from './Icono.vue'
import Spark from './Spark.vue'

const props = defineProps({ p: { type: Object, required: true }, i: Number })
const inv = useInventario()
const ui = useUI()
const a = computed(() => inv.analisis)
const tot = computed(() => totalPiezas(props.p))
const e = computed(() => a.value.estadoTotal(props.p))
const es = computed(() => a.value.estado(props.p))
const ec = computed(() => a.value.estadoCad(props.p))
const lotes = computed(() => lotesDe(props.p).map(l => {
  const d = diasA(l.cad, inv.reloj)
  return { ...l, d, c: d < 0 ? 'crit' : d <= a.value.diasAviso ? 'low' : '' }
}))
const dias = computed(() => diasCorto(a.value.diasRestantes(props.p)))
const consumo = computed(() => a.value.consumoDiario(props.p))
const explicacion = computed(() => {
  const h = a.value.diasHistorial(props.p)
  return `Vende ≈ ${consumo.value.toFixed(1)} pzas/día (últimos ${h} día${h === 1 ? '' : 's'}). ${tot.value} pzas ÷ ${consumo.value.toFixed(1)} = ${(tot.value / consumo.value).toFixed(1)} días.`
})
// Barra de nivel: % del stock respecto al objetivo; la rayita marca el mínimo.
const obj = computed(() => props.p.objetivo * props.p.porPaquete)
const pct = computed(() => (obj.value > 0 ? Math.min(100, tot.value / obj.value * 100) : 0))
const pctMin = computed(() => (obj.value > 0 ? Math.min(100, props.p.minimo / props.p.objetivo * 100) : 0))
</script>

<template>
  <article class="card prod" :class="e" :data-fila="p.id" :style="{ '--i': Math.min(i, 10) }">
    <div>
      <div class="prod-top">
        <h3>{{ p.nombre }}</h3>
        <span class="badge" :class="es">{{ ETIQ[es] }}</span>
        <span v-if="ec !== 'ok'" class="badge cad" :class="ec"><Icono n="clock" sm />{{ ec === 'crit' ? 'Caducado' : 'Por caducar' }}</span>
      </div>
      <div class="prod-meta">
        <span><Icono n="tag" sm />{{ p.categoria || 'Sin categoría' }}</span>
        <span><Icono n="bell" sm />Aviso con {{ fmt(p.minimo) }} paq. ({{ fmt(p.minimo * p.porPaquete) }} pzas)</span>
      </div>
      <div class="prod-stock">
        <span class="total">{{ tot }} <small>pzas</small></span>
        <span v-if="p.porPaquete > 1" class="eq">{{ p.paquetes }} paq. × {{ p.porPaquete }}<template v-if="p.sueltas"> + {{ p.sueltas }} sueltas</template></span>
        <span v-if="dias" class="dias" :title="explicacion"><Icono n="clock" sm />Alcanza {{ dias }}<small class="ritmo">≈ {{ consumo.toFixed(1) }} pzas/día</small></span>
        <Spark :dias="a.ventasDe(p.id).dias" />
      </div>
      <div v-if="obj > 0" class="nivel" :class="es" title="Nivel de stock respecto a lo que quieres tener (la rayita es tu mínimo)">
        <i :style="{ width: pct.toFixed(1) + '%' }" /><u :style="{ left: pctMin.toFixed(1) + '%' }" />
      </div>
      <div v-if="lotes.length" class="lotes">
        <span v-for="l in lotes" :key="l.id" class="lote" :class="l.c"><Icono n="clock" />{{ l.piezas }} pzas · {{ fechaCorta(l.cad) }} · {{ cadTxt(l.d) }}
          <button v-if="l.d < 0" type="button" class="lote-retirar" title="Quitar del inventario lo caducado" @click="inv.retirarCaducados([p])">Retirar</button>
        </span>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="sm principal" @click="ui.abrir('movimiento', { tipo: 'venta', producto: p })"><Icono n="minus" sm />Vendí</button>
      <button type="button" class="sm sec principal" @click="ui.abrir('movimiento', { tipo: 'llegada', producto: p })"><Icono n="truck" sm />Llegó</button>
      <button type="button" class="sm ghost icono" :aria-label="'Editar ' + p.nombre" title="Editar" @click="ui.abrir('producto', { producto: p })"><Icono n="edit" sm /></button>
      <button type="button" class="sm ghost icono" :aria-label="'Eliminar ' + p.nombre" title="Eliminar" @click="inv.eliminar(p)"><Icono n="trash" sm /></button>
    </div>
  </article>
</template>
