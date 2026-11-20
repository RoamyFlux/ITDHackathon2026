<!--
  PANEL DEL INVENTARIO (la app)
  Computadora: resumen arriba; abajo 2 columnas: sugerencias + inventario (izq.) y alertas, ventas, compras y
  herramientas (der.). Celular: una columna, con lo urgente primero, y botón flotante "+".
  También maneja: atajos de teclado, la guía rápida la primera vez y las notificaciones del navegador.
-->
<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useSesion } from '../stores/sesion.js'
import { useUI } from '../stores/ui.js'
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

const inv = useInventario()
const sesion = useSesion()
const ui = useUI()
const prefs = usePreferencias()
const inventario = ref(null)
const irAProducto = id => inventario.value && inventario.value.irAProducto(id)
// La paleta de comandos también puede pedir ir a un producto.
watch(() => ui.ventana, v => { if (v === null && ui.irProducto) { const id = ui.irProducto; ui.irProducto = null; setTimeout(() => irAProducto(id), 60) } })

/* ---- Atajos de teclado ----
 * Ctrl+K paleta de comandos · N nuevo producto · / buscar · ? atajos. No se activan mientras escribes ni con
 * una ventana abierta (salvo Ctrl+K). */
function teclas (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.ventana && ui.ventana.tipo === 'comandos' ? ui.cerrar() : ui.abrir('comandos'); return }
  if (document.querySelector('dialog[open]')) return
  if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); ui.abrir('producto') } else if (e.key === '/') { e.preventDefault(); document.querySelector('#inventario input[type=search]')?.focus() } else if (e.key === '?') { e.preventDefault(); ui.abrir('atajos') }
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
    <div id="appBox">
      <ResumenHero />
      <div class="col-main">
        <PanelSugerencias />
        <Inventario ref="inventario" />
      </div>
      <aside class="col-side">
        <PanelAlertas @ir="irAProducto" />
        <OfertasActivas />
        <ListaCompras />
        <StockCategorias />
        <GraficaVentas v-if="inv.productos.length" />
        <TuPlan />
        <Herramientas />
      </aside>
    </div>
    <button type="button" class="fab" aria-label="Nuevo producto" title="Nuevo producto" @click="ui.abrir('producto')"><Icono n="plus" /></button>
  </main>
  <Pie />
</template>
