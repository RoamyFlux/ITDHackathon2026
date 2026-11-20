<!--
  PANEL DEL INVENTARIO (la app), ORGANIZADO EN PESTAÑAS para no tener que deslizar una página larguísima:
    Hoy        -> resumen, sugerencias y "Requiere atención"
    Inventario -> buscador, filtros y productos (tarjetas o tabla)
    Compras    -> lista de compras          Ofertas -> ofertas activas
    Reportes   -> ventas de 7 días y stock por categoría          Más -> tu plan y herramientas
  Computadora: pestañas arriba (fijas bajo el encabezado). Celular: barra fija abajo, como una app.
  Las pestañas usan v-show (no se destruyen): así el inventario conserva búsqueda y filtros al cambiar.
  También maneja: atajos de teclado, la guía rápida la primera vez y las notificaciones del navegador.
-->
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useSesion } from '../stores/sesion.js'
import { useUI, PESTANAS } from '../stores/ui.js'
import { usePreferencias } from '../stores/preferencias.js'
import Encabezado from '../components/Encabezado.vue'
import ResumenHero from '../components/ResumenHero.vue'
import PanelSugerencias from '../components/PanelSugerencias.vue'
import PanelAlertas from '../components/PanelAlertas.vue'
import Inventario from '../components/Inventario.vue'
import GraficaVentas from '../components/GraficaVentas.vue'
import ListaCompras from '../components/ListaCompras.vue'
import Herramientas from '../components/Herramientas.vue'
import StockCategorias from '../components/StockCategorias.vue'
import OfertasActivas from '../components/OfertasActivas.vue'
import TuPlan from '../components/TuPlan.vue'
import Pie from '../components/Pie.vue'
import Icono from '../components/Icono.vue'
import Pestanas from '../components/Pestanas.vue'

const inv = useInventario()
const sesion = useSesion()
const ui = useUI()
const prefs = usePreferencias()
const inventario = ref(null)
// Ir a un producto: primero a la pestaña Inventario y luego bajar hasta él (desde alertas o la paleta).
function irAProducto (id) {
  const cambio = ui.pestana !== 'inventario'
  ui.cambiarPestana('inventario')
  setTimeout(() => inventario.value && inventario.value.irAProducto(id), cambio ? 80 : 0)
}

/* ---- Pestañas ----
 * Cada una con su contador: Hoy = pendientes urgentes, Compras = productos por comprar, Ofertas = activas. */
const urgentes = computed(() => inv.sugerencias.filter(s => s.prioridad >= 80).length)
const opciones = computed(() => [
  { id: 'hoy', t: 'Hoy', icono: 'spark', n: urgentes.value, alerta: true },
  { id: 'inventario', t: 'Inventario', icono: 'box', n: inv.productos.length },
  { id: 'compras', t: 'Compras', icono: 'cart', n: inv.resumen.nCompras, alerta: inv.resumen.crit.length > 0 },
  { id: 'ofertas', t: 'Ofertas', icono: 'gift', n: inv.ofertaDe.size },
  { id: 'reportes', t: 'Reportes', icono: 'chart' },
  { id: 'mas', t: 'Más', icono: 'sliders' }
])
// Al cambiar de pestaña se sube al inicio del contenido (sin brincos si ya se ve).
watch(() => ui.pestana, () => { if (scrollY > 120) scrollTo({ top: 0, behavior: 'smooth' }) })
// La paleta de comandos también puede pedir ir a un producto.
watch(() => ui.ventana, v => { if (v === null && ui.irProducto) { const id = ui.irProducto; ui.irProducto = null; setTimeout(() => irAProducto(id), 60) } })

/* ---- Atajos de teclado ----
 * Ctrl+K paleta de comandos · N nuevo producto · / buscar · ? atajos · 1 a 6 cambian de pestaña. No se activan mientras escribes ni con
 * una ventana abierta (salvo Ctrl+K). */
function teclas (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.ventana && ui.ventana.tipo === 'comandos' ? ui.cerrar() : ui.abrir('comandos'); return }
  if (document.querySelector('dialog[open]')) return
  if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); ui.abrir('producto') } else if (e.key === '/') { e.preventDefault(); ui.cambiarPestana('inventario'); setTimeout(() => document.querySelector('#inventario input[type=search]')?.focus(), 30) } else if (e.key === '?') { e.preventDefault(); ui.abrir('atajos') } else if (/^[1-6]$/.test(e.key)) { e.preventDefault(); ui.cambiarPestana(PESTANAS[+e.key - 1]) }
}
onMounted(() => addEventListener('keydown', teclas))
onUnmounted(() => removeEventListener('keydown', teclas))

/* ---- Al terminar de cargar ----
 * 1) La primera vez en este dispositivo se muestra la guía rápida.
 * 2) Si se activaron las notificaciones del navegador, un resumen como máximo una vez al día. */
let revisado = false
// (Espera a que se acepten las políticas, si hacía falta, para no encimar ventanas.)
watch(() => inv.cargando || sesion.debeAceptarPoliticas, ocupado => {
  if (ocupado || revisado) return
  revisado = true
  try {
    if (!localStorage.getItem('earlystock.guia')) { localStorage.setItem('earlystock.guia', '1'); ui.abrir('guia') }
  } catch (e) {}
  notificarDelDia()
}, { immediate: true })
function notificarDelDia () {
  if (!prefs.prefs.notificaciones || !('Notification' in window) || Notification.permission !== 'granted') return
  const urg = inv.sugerencias.filter(s => s.prioridad >= 60)
  if (!urg.length) return
  const hoy = new Date().toDateString()
  try { if (localStorage.getItem('earlystock.notificado') === hoy) return; localStorage.setItem('earlystock.notificado', hoy) } catch (e) { return }
  new Notification('EarlyStock: ' + (urg.length === 1 ? 'tienes 1 pendiente' : `tienes ${urg.length} pendientes`), {
    body: urg.slice(0, 3).map(s => '• ' + s.titulo).join('\n'), icon: 'icon-192.png', tag: 'earlystock-diario'
  })
}

// Aviso de conexión: sin internet no se puede guardar en la base de datos.
const enLinea = ref(navigator.onLine)
const alCambiarRed = () => { enLinea.value = navigator.onLine; if (navigator.onLine && !sesion.esDemo) inv.guardar(async () => {}) }
onMounted(() => { addEventListener('online', alCambiarRed); addEventListener('offline', alCambiarRed) })
onUnmounted(() => { removeEventListener('online', alCambiarRed); removeEventListener('offline', alCambiarRed) })
</script>

<template>
  <Encabezado />
  <main>
    <div v-if="sesion.esDemo" class="banner demo noprint">
      <Icono n="spark" /><span><b>Estás en la demostración.</b> Nada se guarda: al salir se borra. ¿Te gustó? Crea tu cuenta para guardar tu inventario.</span>
      <button type="button" class="sm" @click="sesion.salir().then(() => $router.push({ path: '/', query: { ver: 1 } }))">Crear cuenta</button>
    </div>
    <div v-if="!enLinea && !sesion.esDemo" class="banner low noprint"><Icono n="alert" />Sin conexión a internet: los cambios no se guardarán hasta que vuelva.</div>
    <Pestanas :model-value="ui.pestana" :opciones="opciones" etiqueta="Secciones del panel" class="pestanas-panel" @update:model-value="ui.cambiarPestana" />
    <div id="appBox" :class="'en-' + ui.pestana">
      <!-- HOY -->
      <section v-show="ui.pestana === 'hoy'" class="pagina pagina-hoy" role="tabpanel" aria-label="Hoy">
        <ResumenHero />
        <div class="dos-columnas">
          <PanelSugerencias />
          <PanelAlertas @ir="irAProducto" />
        </div>
      </section>
      <!-- INVENTARIO -->
      <section v-show="ui.pestana === 'inventario'" class="pagina" role="tabpanel" aria-label="Inventario">
        <Inventario ref="inventario" />
      </section>
      <!-- COMPRAS -->
      <section v-show="ui.pestana === 'compras'" class="pagina angosta" role="tabpanel" aria-label="Compras">
        <ListaCompras />
      </section>
      <!-- OFERTAS -->
      <section v-show="ui.pestana === 'ofertas'" class="pagina angosta" role="tabpanel" aria-label="Ofertas">
        <OfertasActivas />
        <p v-if="!inv.productos.length" class="vacio-mini">Agrega productos para poder ponerlos en oferta.</p>
      </section>
      <!-- REPORTES -->
      <section v-show="ui.pestana === 'reportes'" class="pagina" role="tabpanel" aria-label="Reportes">
        <div v-if="inv.productos.length" class="dos-columnas">
          <GraficaVentas />
          <StockCategorias />
        </div>
        <p v-else class="card vacio-lista">Cuando agregues productos y registres ventas, aquí verás tus reportes.</p>
      </section>
      <!-- MÁS -->
      <section v-show="ui.pestana === 'mas'" class="pagina" role="tabpanel" aria-label="Más">
        <div class="dos-columnas">
          <TuPlan />
          <Herramientas />
        </div>
      </section>
    </div>
    <button type="button" class="fab" aria-label="Nuevo producto" title="Nuevo producto" @click="ui.abrir('producto')"><Icono n="plus" /></button>
  </main>
  <Pie />
</template>
