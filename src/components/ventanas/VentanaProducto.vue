<!--
  VENTANA DE PRODUCTO (crear o editar)
  Datos: nombre, PRESENTACIÓN (600 ml, 1 kg…) y SABOR (opcionales: cada combinación es una variante del mismo
  producto y se ve dentro de su tarjeta), categoría (con sugerencias), existencia en paquetes + sueltas,
  cuándo avisar (mínimo) y cuánto quieres tener (objetivo), costo y precio (opcionales), y caducidad del
  primer lote (solo al crear). Muestra en vivo "Total en tienda: N piezas".
  SIN DUPLICADOS: si ya existe uno con el mismo nombre, presentación y sabor, avisa en vivo que se SUMARÁ a ese.
-->
<script setup>
import { ref, computed } from 'vue'
import { useInventario } from '../../stores/inventario.js'
import { totalPiezas, nombreCompleto } from '../../logica/inventario.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

// producto = editar ese; base = {nombre, categoria} para agregar otra presentación o sabor a un producto existente.
const props = defineProps({ producto: Object, base: Object })
const emit = defineEmits(['cerrar'])
const inv = useInventario()
const p = props.producto
const b = props.base || {}
const f = ref({
  nombre: p ? p.nombre : (b.nombre || ''), presentacion: p ? p.presentacion : '', sabor: p ? p.sabor : '', categoria: p ? p.categoria : (b.categoria || ''), paquetes: p ? p.paquetes : 0, porPaquete: p ? p.porPaquete : 12,
  sueltas: p ? p.sueltas : 0, minimo: p ? p.minimo : 1, objetivo: p ? p.objetivo : 4, costo: p ? p.costo : null, precio: p ? p.precio : null, cad: ''
})
const n = (v, d = 0) => (v === '' || v === null || v === undefined || isNaN(+v) ? d : +v)
const total = computed(() => Math.max(0, Math.floor(n(f.value.paquetes))) * Math.max(1, Math.floor(n(f.value.porPaquete, 1))) + Math.max(0, Math.floor(n(f.value.sueltas))))
const objetivoBajo = computed(() => n(f.value.objetivo) < n(f.value.minimo))
// ¿Ya existe uno igual (mismo nombre, presentación y sabor)?
const igual = computed(() => { const x = inv.buscarIgual(f.value); return x && (!p || x.id !== p.id) ? x : null })
// Presentaciones y sabores que ya tiene este producto (para sugerirlos al escribir).
const hermanas = computed(() => inv.variantesDe(f.value.nombre))
const presentaciones = computed(() => [...new Set(hermanas.value.map(x => x.presentacion).filter(Boolean))])
const sabores = computed(() => [...new Set(hermanas.value.map(x => x.sabor).filter(Boolean))])

async function guardar () {
  const x = f.value
  const data = {
    nombre: String(x.nombre).trim().slice(0, 60), presentacion: String(x.presentacion || '').trim().slice(0, 30), sabor: String(x.sabor || '').trim().slice(0, 30),
    categoria: inv.unificarCategoria(x.categoria),
    paquetes: Math.max(0, Math.floor(n(x.paquetes))), porPaquete: Math.max(1, Math.floor(n(x.porPaquete, 1))), sueltas: Math.max(0, Math.floor(n(x.sueltas))),
    minimo: Math.max(0, n(x.minimo)), objetivo: Math.max(0, n(x.objetivo)),
    costo: x.costo === '' || x.costo === null ? null : Math.max(0, n(x.costo)), precio: x.precio === '' || x.precio === null ? null : Math.max(0, n(x.precio))
  }
  if (!data.nombre) return
  if (p && igual.value) return // editar no puede convertirlo en otro que ya existe
  emit('cerrar')
  await inv.guardarProducto(p ? p.id : null, data, p ? '' : x.cad)
}
</script>

<template>
  <Ventana :titulo="p ? 'Editar producto' : b.nombre ? 'Nueva presentación o sabor' : 'Nuevo producto'" :subtitulo="p ? nombreCompleto(p) : b.nombre ? b.nombre : 'Cuéntalo por paquetes: más rápido que pieza por pieza'" icono="box" @cerrar="emit('cerrar')">
    <form @submit.prevent="guardar">
      <label>Nombre del producto<input v-model="f.nombre" required maxlength="60" placeholder="Ej. Refresco" :autofocus="!b.nombre"></label>
      <div class="row2">
        <label>Presentación <small>(opcional)</small><input v-model="f.presentacion" maxlength="30" list="lista-presentaciones" placeholder="Ej. 600 ml, 2 L, 1 kg" :autofocus="!!b.nombre"></label>
        <label>Sabor o variedad <small>(opcional)</small><input v-model="f.sabor" maxlength="30" list="lista-sabores" placeholder="Ej. Cola, Fresa"></label>
      </div>
      <datalist id="lista-presentaciones"><option v-for="x in presentaciones" :key="x" :value="x" /></datalist>
      <datalist id="lista-sabores"><option v-for="x in sabores" :key="x" :value="x" /></datalist>
      <p v-if="igual && !p" class="nota" role="status"><Icono n="layers" sm /> "{{ nombreCompleto(igual) }}" ya existe ({{ totalPiezas(igual) }} pzas): no se creará otro, se le <b>sumarán</b> las piezas que escribas.</p>
      <p v-else-if="igual && p" class="nota low" role="alert">Ya existe otro producto "{{ nombreCompleto(igual) }}". Cambia la presentación o el sabor.</p>
      <p v-else-if="hermanas.length && !p" class="hint">"{{ f.nombre }}" ya tiene {{ hermanas.length === 1 ? '1 presentación o sabor' : hermanas.length + ' presentaciones o sabores' }}: esta se agregará dentro de la misma tarjeta.</p>
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
        <button type="submit" :disabled="!!(p && igual)">{{ p ? 'Guardar cambios' : igual ? 'Sumar al existente' : 'Agregar producto' }}</button>
      </div>
    </form>
  </Ventana>
</template>
