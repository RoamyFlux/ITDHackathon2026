<!--
  RESUMEN (mosaico "bento" de arriba)
  Izquierda: saludo, fecha, anillo "% en riesgo" y botón "Nuevo producto".
  Derecha: números clave. El valor del inventario NO aparece aquí a propósito: lo importante es qué hacer hoy.
    Productos · Urgentes · Por acabarse · Por caducar · Por comprar
  ANILLO: % de productos con alguna alerta (cantidad o caducidad). < 30 % verde, 30–59 % ámbar, ≥ 60 % rojo.
  r = 27 -> circunferencia 169.65; stroke-dashoffset es la parte "vacía".
-->
<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useSesion } from '../stores/sesion.js'
import { useUI } from '../stores/ui.js'
import { usePreferencias } from '../stores/preferencias.js'
import Icono from './Icono.vue'
import InsigniaPlan from './InsigniaPlan.vue'
import { usePlan } from '../stores/plan.js'
import { useSoporte } from '../stores/soporte.js'

const inv = useInventario()
const sesion = useSesion()
const ui = useUI()
const prefs = usePreferencias()
const plan = usePlan()
const soporte = useSoporte()
const r = computed(() => inv.resumen)
const total = computed(() => inv.productos.length)
const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase())
const nivel = computed(() => (r.value.pct >= 60 ? 'crit' : r.value.pct >= 30 ? 'low' : 'ok'))
const textoNivel = computed(() => ({ crit: 'Riesgo alto', low: 'Atención', ok: 'Inventario sano' })[nivel.value])

// Números que "cuentan" de 0 al valor real en ~0.9 s (solo al cargar datos y con animaciones activas).
const mostrados = ref({})
function contar (clave, fin) {
  if (!prefs.movimientoActivo()) { mostrados.value[clave] = fin; return }
  const t0 = performance.now()
  const paso = t => {
    const k = Math.min(1, (t - t0) / 900)
    mostrados.value[clave] = Math.round(fin * (1 - Math.pow(1 - k, 3)))
    if (k < 1) requestAnimationFrame(paso)
  }
  requestAnimationFrame(paso)
}
const STATS = computed(() => [
  { k: 'productos', i: 'box', t: 'Productos', n: total.value, c: '', ayuda: 'Productos registrados' },
  { k: 'crit', i: 'alert', t: 'Urgentes', n: r.value.crit.length, c: 'crit', ayuda: 'Agotados o en su mínimo', filtro: 'crit' },
  { k: 'low', i: 'down', t: 'Por acabarse', n: r.value.low.length, c: 'low', ayuda: 'Cerca del mínimo o alcanzan ≤ 2 días', filtro: 'low' },
  { k: 'cad', i: 'clock', t: 'Por caducar', n: r.value.nCad, c: 'low', ayuda: `Caducan en ${prefs.prefs.diasAviso} días o menos` },
  { k: 'compras', i: 'cart', t: 'Por comprar', n: r.value.nCompras, c: 'marca', ayuda: 'Productos en tu lista de compras', ir: 'compras' }
])
const anim = ref(false)
function animarTodo () {
  STATS.value.forEach(s => contar(s.k, s.n))
  contar('pct', r.value.pct)
}
// Al llegar los datos (animar=true) se anima; en los demás cambios se actualiza directo.
watch(() => [inv.animar, STATS.value.map(s => s.n).join(), r.value.pct], () => {
  if (inv.animar) { anim.value = true; animarTodo(); setTimeout(() => { anim.value = false }, 1200) } else {
    STATS.value.forEach(s => { mostrados.value[s.k] = s.n })
    mostrados.value.pct = r.value.pct
  }
}, { immediate: true })
const arco = ref(169.65)
watch(() => r.value.pct, p => { requestAnimationFrame(() => { arco.value = 169.65 * (1 - p / 100) }) }, { immediate: true })
onMounted(() => animarTodo())

function tocar (s) {
  if (s.filtro) { inv.filtros = { q: '', estado: s.filtro, categoria: '' }; ui.irA('inventario') } else if (s.ir) ui.irA(s.ir)
}
</script>

<template>
  <section class="bento" aria-label="Resumen">
    <div class="card saludo hero" :class="'banda-' + plan.planId">
      <!-- Banda del plan: ninguna en Gratis, plata en Pro y oro brillante en Max. -->
      <button v-if="plan.planId !== 'gratis'" type="button" class="banda-plan" :class="plan.planId" :title="'Plan ' + plan.plan.nombre" @click="ui.abrir('planes')">
        <Icono :n="plan.planId === 'max' ? 'crown' : 'star'" sm />Plan {{ plan.plan.nombre }}
      </button>
      <div>
        <h1>Hola, <span>{{ sesion.perfil.negocio || 'bienvenido' }}</span> <InsigniaPlan :plan="plan.planId" :admin="soporte.esAdmin || plan.esAdmin" grande /></h1>
        <p>{{ fecha }}</p>
      </div>
      <div class="saludo-der">
        <div v-if="total" class="salud" :class="nivel" role="img" :aria-label="`${r.pct}% del inventario en riesgo: ${r.enRiesgo} de ${total} productos requieren atención`" :title="`${r.enRiesgo} de ${total} productos requieren atención`">
          <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="pista" cx="32" cy="32" r="27" /><circle class="valor" cx="32" cy="32" r="27" :style="{ strokeDashoffset: arco.toFixed(2) }" /></svg>
          <div><b>{{ mostrados.pct ?? r.pct }}% en riesgo</b><span>{{ textoNivel }} · {{ r.enRiesgo }} de {{ total }}</span></div>
        </div>
        <button type="button" class="btn-nuevo" @click="ui.abrir('producto')"><Icono n="plus" />Nuevo producto</button>
      </div>
    </div>
    <div class="stats" :class="{ anim }">
      <button v-for="(s, k) in STATS" :key="s.k" type="button" class="card stat" :class="[s.c, { activo: s.c && s.n > 0 }]" :style="{ '--i': k }" :title="s.ayuda" @click="tocar(s)">
        <span class="ico-stat"><Icono :n="s.i" /></span>
        <span class="stat-txt"><span class="et">{{ s.t }}</span><b>{{ mostrados[s.k] ?? s.n }}</b><small>{{ s.ayuda }}</small></span>
      </button>
    </div>
  </section>
</template>
