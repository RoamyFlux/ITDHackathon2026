<!--
  SECCIÓN INVENTARIO
  Buscador · filtros por estado (con contador) · filtros por categoría · leyenda del semáforo ·
  vista Tarjetas o Tabla. Orden: urgentes, atención y bien surtidos (y alfabético).
  LISTA POR PARTES: se muestran de 60 en 60; en Tarjetas se agregan solos al acercarse al final.
-->
<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { usePreferencias } from '../stores/preferencias.js'
import Icono from './Icono.vue'
import TarjetaProducto from './TarjetaProducto.vue'
import TablaInventario from './TablaInventario.vue'

const inv = useInventario()
const prefs = usePreferencias()
const a = computed(() => inv.analisis)
const f = computed(() => inv.filtros)
const catDe = p => p.categoria || 'Sin categoría'
const verLeyenda = ref(false)

const cats = computed(() => {
  const c = {}
  inv.productos.forEach(p => { c[catDe(p)] = (c[catDe(p)] || 0) + 1 })
  return Object.entries(c).sort((x, y) => x[0].localeCompare(y[0], 'es'))
})
const enCat = computed(() => inv.productos.filter(p => !f.value.categoria || catDe(p) === f.value.categoria))
const cuenta = computed(() => {
  const c = { '': enCat.value.length, crit: 0, low: 0, ok: 0 }
  enCat.value.forEach(p => c[a.value.estadoTotal(p)]++)
  return c
})
const ORDEN = { crit: 0, low: 1, ok: 2 }
const visibles = computed(() => {
  const q = f.value.q.trim().toLowerCase()
  return enCat.value
    .filter(p => (!q || (p.nombre + ' ' + (p.categoria || '')).toLowerCase().includes(q)) && (!f.value.estado || a.value.estadoTotal(p) === f.value.estado))
    .sort((x, y) => ORDEN[a.value.estadoTotal(x)] - ORDEN[a.value.estadoTotal(y)] || x.nombre.localeCompare(y.nombre))
})

// Lista por partes.
const PASO = 60
const limite = ref(PASO)
watch(() => [f.value.q, f.value.estado, f.value.categoria, prefs.prefs.vista, inv.ordenTabla.col, inv.ordenTabla.dir], () => { limite.value = PASO })
const mas = ref(null)
let obs = null
onMounted(() => {
  if ('IntersectionObserver' in window) obs = new IntersectionObserver(ents => { if (ents.some(x => x.isIntersecting) && prefs.prefs.vista === 'tarjetas') limite.value += PASO }, { rootMargin: '500px' })
})
watch(mas, (el, viejo) => { if (obs) { if (viejo) obs.unobserve(viejo); if (el) obs.observe(el) } })
onUnmounted(() => obs && obs.disconnect())

const quitarFiltros = () => { inv.filtros = { q: '', estado: '', categoria: '' } }
const setFiltro = (k, v) => { inv.filtros = { ...inv.filtros, [k]: v } }

// Bajar hasta un producto y resaltarlo (se usa desde alertas y la paleta de comandos).
async function irAProducto (id) {
  if (!visibles.value.some(p => p.id === id)) quitarFiltros()
  await nextTick()
  const pos = visibles.value.findIndex(p => p.id === id)
  if (pos >= limite.value) limite.value = pos + 1
  await nextTick()
  const el = document.querySelector(`#inventario [data-fila="${id}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.remove('resaltar'); void el.offsetWidth; el.classList.add('resaltar')
}
defineExpose({ irAProducto })
</script>

<template>
  <section id="inventario">
    <div class="sec-tit">
      <h2><Icono n="box" />Inventario</h2>
      <div class="seg vista" role="group" aria-label="Vista del inventario">
        <button type="button" :aria-pressed="prefs.prefs.vista === 'tarjetas'" @click="prefs.cambiar('vista', 'tarjetas'); inv.animar = true"><Icono n="grid" sm />Tarjetas</button>
        <button type="button" :aria-pressed="prefs.prefs.vista === 'tabla'" @click="prefs.cambiar('vista', 'tabla'); inv.animar = true"><Icono n="table" sm />Tabla</button>
      </div>
    </div>
    <div class="buscar"><Icono n="search" /><input :value="f.q" type="search" placeholder="Buscar producto o categoría" aria-label="Buscar producto" maxlength="60" @input="setFiltro('q', $event.target.value)" @keydown.esc="setFiltro('q', '')"></div>
    <div class="chips">
      <button v-for="[v, t] in [['', 'Todos'], ['crit', 'Urgentes'], ['low', 'Atención'], ['ok', 'Bien surtidos']]" :key="v" type="button" class="chip" :class="{ activo: f.estado === v }" :aria-pressed="f.estado === v" @click="setFiltro('estado', v)">
        <span v-if="v" class="dot" :class="v" />{{ t }}<span class="n">{{ cuenta[v] }}</span>
      </button>
      <button type="button" class="chip ayuda" :aria-expanded="verLeyenda" @click="verLeyenda = !verLeyenda"><Icono n="help" sm />¿Qué significan los colores?</button>
    </div>
    <Transition name="baja">
      <div v-if="verLeyenda" class="leyenda card">
        <p><span class="dot crit" /><b>Urgente:</b> se agotó, está en tu mínimo o tiene lotes caducados.</p>
        <p><span class="dot low" /><b>Atención:</b> cerca del mínimo, alcanza 2 días o menos, o caduca en {{ prefs.prefs.diasAviso }} días o menos.</p>
        <p><span class="dot ok" /><b>Bien surtido:</b> tienes suficiente.</p>
        <p class="nota"><Icono n="clock" sm />"Alcanza ~N días" = piezas que tienes ÷ lo que vendes al día (últimos 7 días). Pasa el mouse sobre él para ver la cuenta.</p>
      </div>
    </Transition>
    <div v-if="cats.length > 1" class="chips cats">
      <span class="cats-tit"><Icono n="tag" sm />Categoría</span>
      <button type="button" class="chip" :class="{ activo: !f.categoria }" :aria-pressed="!f.categoria" @click="setFiltro('categoria', '')">Todas<span class="n">{{ inv.productos.length }}</span></button>
      <button v-for="[c, n] in cats" :key="c" type="button" class="chip" :class="{ activo: f.categoria === c }" :aria-pressed="f.categoria === c" @click="setFiltro('categoria', c)">{{ c }}<span class="n">{{ n }}</span></button>
    </div>

    <div class="list" :class="{ anim: inv.animar }">
      <template v-if="inv.cargando && !inv.productos.length"><div class="esqueleto" /><div class="esqueleto" /><div class="esqueleto" /></template>
      <div v-else-if="!visibles.length" class="card vacio-lista">
        <Icono :n="inv.productos.length ? 'search' : 'box'" />
        <div>{{ inv.productos.length ? 'Nada coincide con tu búsqueda o filtro.' : 'Aún no tienes productos. Agrega el primero con "Nuevo producto".' }}</div>
        <button v-if="inv.productos.length" type="button" class="sec sm" @click="quitarFiltros"><Icono n="x" sm />Quitar filtros</button>
      </div>
      <TablaInventario v-else-if="prefs.prefs.vista === 'tabla'" :filas="visibles" :limite="limite" />
      <TarjetaProducto v-for="(p, k) in visibles.slice(0, limite)" v-else :key="p.id" :p="p" :i="k" />
      <button v-if="visibles.length > limite" ref="mas" type="button" class="sec mas" @click="limite += PASO">
        <Icono n="dn" sm />Mostrar {{ Math.min(PASO, visibles.length - limite) }} más · {{ limite }} de {{ visibles.length }}
      </button>
    </div>
  </section>
</template>
