<!--
  VENTANA DE PRODUCTO (crear o editar)
  Datos: nombre, categoría (con sugerencias de las existentes), existencia en paquetes + sueltas,
  cuándo avisar (mínimo) y cuánto quieres tener (objetivo), costo y precio (opcionales), y caducidad del
  primer lote (solo al crear). Muestra en vivo "Total en tienda: N piezas".
-->
<script setup>
import { ref, computed } from 'vue'
import { useInventario } from '../../stores/inventario.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const props = defineProps({ producto: Object })
const emit = defineEmits(['cerrar'])
const inv = useInventario()
const p = props.producto
const f = ref({
  nombre: p ? p.nombre : '', categoria: p ? p.categoria : '', paquetes: p ? p.paquetes : 0, porPaquete: p ? p.porPaquete : 12,
  sueltas: p ? p.sueltas : 0, minimo: p ? p.minimo : 1, objetivo: p ? p.objetivo : 4, costo: p ? p.costo : null, precio: p ? p.precio : null, cad: ''
})
const n = (v, d = 0) => (v === '' || v === null || v === undefined || isNaN(+v) ? d : +v)
const total = computed(() => Math.max(0, Math.floor(n(f.value.paquetes))) * Math.max(1, Math.floor(n(f.value.porPaquete, 1))) + Math.max(0, Math.floor(n(f.value.sueltas))))
const objetivoBajo = computed(() => n(f.value.objetivo) < n(f.value.minimo))

async function guardar () {
  const x = f.value
  const data = {
    nombre: String(x.nombre).trim().slice(0, 60), categoria: inv.unificarCategoria(x.categoria),
    paquetes: Math.max(0, Math.floor(n(x.paquetes))), porPaquete: Math.max(1, Math.floor(n(x.porPaquete, 1))), sueltas: Math.max(0, Math.floor(n(x.sueltas))),
    minimo: Math.max(0, n(x.minimo)), objetivo: Math.max(0, n(x.objetivo)),
    costo: x.costo === '' || x.costo === null ? null : Math.max(0, n(x.costo)), precio: x.precio === '' || x.precio === null ? null : Math.max(0, n(x.precio))
  }
  if (!data.nombre) return
  emit('cerrar')
  await inv.guardarProducto(p ? p.id : null, data, p ? '' : x.cad)
}
</script>

<template>
  <Ventana :titulo="p ? 'Editar producto' : 'Nuevo producto'" :subtitulo="p ? p.nombre : 'Cuéntalo por paquetes: más rápido que pieza por pieza'" icono="box" @cerrar="emit('cerrar')">
    <form @submit.prevent="guardar">
      <label>Nombre del producto<input v-model="f.nombre" required maxlength="60" placeholder="Ej. Refresco 600 ml" autofocus></label>
      <label>Categoría <small>(opcional)</small><input v-model="f.categoria" maxlength="30" list="lista-categorias" placeholder="Ej. Bebidas"></label>
      <datalist id="lista-categorias"><option v-for="c in inv.categorias" :key="c" :value="c" /></datalist>
      <div class="fieldset">
        <h3><Icono n="layers" sm />¿Cuánto tienes?</h3>
        <div class="row3">
          <label>Paquetes<input v-model="f.paquetes" type="number" min="0" max="1000000" step="1" inputmode="numeric"></label>
          <label>Piezas por paquete<input v-model="f.porPaquete" type="number" min="1" max="100000" step="1" inputmode="numeric" required></label>
          <label>Sueltas<input v-model="f.sueltas" type="number" min="0" max="1000000" step="1" inputmode="numeric"></label>
        </div>
        <div class="previa">Total en tienda <b>{{ total }} pieza{{ total === 1 ? '' : 's' }}</b></div>
      </div>
      <div class="fieldset">
        <h3><Icono n="bell" sm />¿Cuándo te avisamos?</h3>
        <div class="row2">
          <label>Avisarme cuando queden (paquetes)<input v-model="f.minimo" type="number" min="0" max="100000" step="0.5" inputmode="decimal"></label>
          <label>Quiero tener (paquetes)<input v-model="f.objetivo" type="number" min="0" max="100000" step="0.5" inputmode="decimal"></label>
        </div>
        <p v-if="objetivoBajo" class="hint aviso-objetivo">"Quiero tener" es menor que el aviso: la lista de compras pediría muy poco.</p>
        <p v-else class="hint">La lista de compras pide lo necesario para llegar a "Quiero tener".</p>
      </div>
      <div class="fieldset">
        <h3><Icono n="tag" sm />Precios <small>(opcional, para calcular ofertas y pérdidas)</small></h3>
        <div class="row2">
          <label>Costo por pieza<input v-model="f.costo" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" placeholder="$"></label>
          <label>Precio de venta<input v-model="f.precio" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" placeholder="$"></label>
        </div>
      </div>
      <label v-if="!p">Caducidad <small>(opcional: si el producto caduca)</small><input v-model="f.cad" type="date"></label>
      <div class="dlg-acciones">
        <button type="button" class="sec" @click="emit('cerrar')">Cancelar</button>
        <button type="submit">{{ p ? 'Guardar cambios' : 'Agregar producto' }}</button>
      </div>
    </form>
  </Ventana>
</template>
