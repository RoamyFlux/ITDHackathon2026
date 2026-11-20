<!--
  VENTANA DE MOVIMIENTO: venta ("Vendí") o llegada de mercancía ("Llegó")
  Venta: se escriben PIEZAS; si no alcanzan las sueltas se abre un paquete solo.
  Llegada: PAQUETES o PIEZAS SUELTAS (selector), con caducidad opcional (crea un lote).
  Vista previa: cuánto quedará después de registrar.
-->
<script setup>
import { ref, computed } from 'vue'
import { useInventario } from '../../stores/inventario.js'
import { totalPiezas, nombreCompleto } from '../../logica/inventario.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const props = defineProps({ tipo: String, producto: Object })
const emit = defineEmits(['cerrar'])
const inv = useInventario()
const p = props.producto
const venta = props.tipo === 'venta'
const cant = ref(1)
const unidad = ref('paq')
const cad = ref('')
const hay = totalPiezas(p)
const n = computed(() => Math.max(0, Math.floor(+cant.value || 0)))
const piezas = computed(() => (venta || unidad.value === 'pza' ? n.value : n.value * p.porPaquete))
const despues = computed(() => (venta ? Math.max(0, hay - n.value) : hay + piezas.value))
const excede = computed(() => venta && n.value > hay)
const atajos = computed(() => (venta
  ? [1, 5, 10].concat(p.porPaquete > 1 && ![1, 5, 10].includes(p.porPaquete) ? [p.porPaquete] : [])
  : unidad.value === 'pza' ? [1, 5, 10, 20] : [1, 2, 5, 10]))
const paso = d => { cant.value = Math.max(1, (Math.floor(+cant.value) || 0) + d) }

function registrar () {
  if (!(n.value > 0) || (venta && hay === 0)) return
  emit('cerrar')
  if (venta) inv.vender(p.id, n.value)
  else inv.llegada(p.id, n.value, unidad.value, cad.value)
}
</script>

<template>
  <Ventana :titulo="venta ? 'Registrar venta' : 'Llegó mercancía'" :subtitulo="`${nombreCompleto(p)} · hay ${hay} pzas`" :icono="venta ? 'minus' : 'truck'" ancho="sm" @cerrar="emit('cerrar')">
    <form @submit.prevent="registrar">
      <div v-if="!venta && p.porPaquete > 1" class="seg unidad" role="group" aria-label="¿Qué llegó?">
        <button type="button" :aria-pressed="unidad === 'paq'" @click="unidad = 'paq'"><Icono n="box" sm />Paquetes</button>
        <button type="button" :aria-pressed="unidad === 'pza'" @click="unidad = 'pza'"><Icono n="layers" sm />Piezas sueltas</button>
      </div>
      <div class="campo"><span id="etq-cant">{{ venta ? 'Piezas vendidas' : unidad === 'pza' ? 'Piezas sueltas que llegaron' : 'Paquetes que llegaron' }}</span>
        <div class="stepper">
          <button type="button" class="sec" aria-label="Menos" @click="paso(-1)"><Icono n="minus" /></button>
          <input v-model="cant" type="number" min="1" max="1000000" step="1" inputmode="numeric" required autofocus aria-labelledby="etq-cant">
          <button type="button" class="sec" aria-label="Más" @click="paso(1)"><Icono n="plus" /></button>
        </div>
      </div>
      <p class="hint">{{ venta ? 'Si no alcanzan las piezas sueltas, se abre un paquete automáticamente.' : unidad === 'pza' ? 'Se suman como piezas sueltas (sin paquete).' : `Cada paquete trae ${p.porPaquete} pieza${p.porPaquete === 1 ? '' : 's'}.` }}</p>
      <div class="rapidos">
        <button v-for="a in atajos" :key="a" type="button" class="chip" @click="cant = a">{{ venta && a === p.porPaquete && p.porPaquete > 1 ? `1 paquete (${a})` : a }}</button>
      </div>
      <label v-if="!venta">Caducidad de lo que llegó <small>(opcional)</small><input v-model="cad" type="date"></label>
      <div class="previa" :class="{ aviso: excede || (venta && hay === 0) }">
        <template v-if="venta && hay === 0"><Icono n="alert" sm />No hay existencias para vender. <b>0 pzas</b></template>
        <template v-else-if="excede"><Icono n="alert" sm />Solo hay {{ hay }} pzas: se registrarán {{ hay }}. <b>0 pzas</b></template>
        <template v-else>{{ venta ? 'Quedarán en tienda' : 'Tendrás en tienda' }} <b>{{ despues }} pzas</b></template>
      </div>
      <div class="dlg-acciones">
        <button type="button" class="sec" @click="emit('cerrar')">Cancelar</button>
        <button type="submit" :disabled="venta && hay === 0">{{ venta ? 'Registrar venta' : 'Registrar llegada' }}</button>
      </div>
    </form>
  </Ventana>
</template>
