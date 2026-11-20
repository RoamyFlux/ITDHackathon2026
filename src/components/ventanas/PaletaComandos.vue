<!--
  PALETA DE COMANDOS (Ctrl + K)
  Un buscador para hacer cualquier cosa sin el mouse: acciones, apariencia, cuenta, categorías y productos
  ("Vender: Leche", "Llegó: Arroz"…). Flechas para moverse, Enter para ejecutar, Esc para cerrar.
  Si se abre desde otra página (por ejemplo Administración), los comandos del panel primero regresan al panel.
-->
<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useInventario } from '../../stores/inventario.js'
import { useUI } from '../../stores/ui.js'
import { useSesion } from '../../stores/sesion.js'
import { useAvisos } from '../../stores/avisos.js'
import { usePreferencias, TEMAS, ACENTOS } from '../../stores/preferencias.js'
import { totalPiezas, nombreCompleto } from '../../logica/inventario.js'
import { ETIQ, norm } from '../../logica/formato.js'
import { exportarInventario, descargarPlantilla } from '../../lib/exportar.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const emit = defineEmits(['cerrar'])
const inv = useInventario()
const ui = useUI()
const sesion = useSesion()
const avisos = useAvisos()
const ps = usePreferencias()
const q = ref('')
const sel = ref(0)
const lista = ref(null)
const router = useRouter()
const route = useRoute()
// Ejecuta algo del panel: si no estamos en él, primero va al panel y luego lo hace.
function enPanel (fn) {
  ui.cerrar()
  if (route.name === 'app') return setTimeout(fn, 60)
  router.push({ name: 'app' }).then(() => setTimeout(fn, 250))
}

// Cada comando: g (grupo), i (ícono), t (texto), d (detalle), k (atajo), f (qué hace).
function comandos () {
  const ir = id => () => enPanel(() => ui.irA(id))
  const c = [
    { g: 'Acciones', i: 'plus', t: 'Nuevo producto', k: 'N', f: () => ui.abrir('producto') },
    ...[['hoy', 'Hoy', 'spark'], ['inventario', 'Inventario', 'box'], ['compras', 'Compras', 'cart'], ['ofertas', 'Ofertas', 'gift'], ['reportes', 'Reportes', 'chart'], ['mas', 'Más (plan y herramientas)', 'sliders']]
      .map(([id, t, i], k) => ({ g: 'Ir a', i, t: `Ir a ${t}`, k: String(k + 1), f: () => enPanel(() => ui.cambiarPestana(id)) })),
    { g: 'Acciones', i: 'bulb', t: 'Ver sugerencias para hoy', f: ir('sugerencias') },
    { g: 'Acciones', i: 'cart', t: 'Ver lista de compras', f: ir('compras') },
    { g: 'Acciones', i: 'chart', t: 'Ver ventas de la semana', f: ir('ventas') },
    { g: 'Acciones', i: 'upload', t: 'Importar productos desde Excel', f: () => ui.abrir('importar') },
    { g: 'Acciones', i: 'download', t: 'Exportar inventario a Excel', f: () => { ui.cerrar(); exportarInventario(inv, sesion, avisos) } },
    { g: 'Acciones', i: 'file', t: 'Descargar plantilla de Excel', f: () => { ui.cerrar(); descargarPlantilla(avisos) } },
    { g: 'Acciones', i: 'gift', t: 'Ver ofertas activas', f: ir('ofertas') },
    { g: 'Acciones', i: 'layers', t: 'Ver stock por categoría', f: ir('categorias') },
    { g: 'Cuenta', i: 'chat', t: 'Contactar a soporte', f: () => ui.abrir('soporte') },
    { g: 'Cuenta', i: 'star', t: 'Planes y precios', f: () => ui.abrir('planes') },
    { g: 'Acciones', i: 'trash', t: 'Retirar productos caducados', f: () => { ui.cerrar(); inv.retirarCaducados() } },
    { g: 'Acciones', i: 'spark', t: 'Cargar tienda de ejemplo', f: () => { ui.cerrar(); inv.cargarEjemplo() } },
    { g: 'Apariencia', i: 'table', t: 'Ver inventario como tabla', f: () => { ui.cerrar(); ps.cambiar('vista', 'tabla') } },
    { g: 'Apariencia', i: 'grid', t: 'Ver inventario como tarjetas', f: () => { ui.cerrar(); ps.cambiar('vista', 'tarjetas') } },
    ...TEMAS.map(t => ({ g: 'Apariencia', i: t.icono, t: `Tema: ${t.t}`, f: () => ps.cambiar('tema', t.v) })),
    ...ACENTOS.map(a => ({ g: 'Apariencia', i: 'palette', t: `Color: ${a.t}`, f: () => ps.cambiar('acento', a.v) })),
    { g: 'Apariencia', i: 'gear', t: 'Abrir configuración', f: () => ui.abrir('configuracion') },
    { g: 'Cuenta', i: 'user', t: 'Mi perfil', f: () => ui.abrir('perfil') },
    { g: 'Cuenta', i: 'shield', t: 'Seguridad y llaves de acceso', f: () => ui.abrir('seguridad') },
    { g: 'Cuenta', i: 'help', t: 'Guía rápida', f: () => ui.abrir('guia') },
    { g: 'Cuenta', i: 'keyboard', t: 'Atajos de teclado', k: '?', f: () => ui.abrir('atajos') },
    { g: 'Cuenta', i: 'logout', t: 'Cerrar sesión', f: () => { ui.cerrar(); sesion.salir('Desde la paleta de comandos') } }
  ]
  if (!sesion.esDemo) c.splice(c.length - 2, 0, { g: 'Cuenta', i: 'lock', t: 'Cambiar contraseña', f: () => ui.abrir('contrasena') })
  inv.categorias.forEach(cat => c.push({ g: 'Categorías', i: 'tag', t: `Categoría: ${cat}`, f: () => { inv.filtros = { q: '', estado: '', categoria: cat }; ir('inventario')() } }))
  inv.productos.forEach(p => c.push(
    { g: 'Productos', i: 'minus', t: `Vender: ${nombreCompleto(p)}`, d: `${totalPiezas(p)} pzas`, f: () => ui.abrir('movimiento', { tipo: 'venta', producto: p }) },
    { g: 'Productos', i: 'truck', t: `Llegó: ${nombreCompleto(p)}`, f: () => ui.abrir('movimiento', { tipo: 'llegada', producto: p }) },
    { g: 'Productos', i: 'edit', t: `Editar: ${nombreCompleto(p)}`, f: () => ui.abrir('producto', { producto: p }) },
    { g: 'Productos', i: 'gift', t: `Oferta: ${nombreCompleto(p)}`, f: () => ui.abrir('oferta', { producto: p }) },
    { g: 'Productos', i: 'search', t: `Ver: ${nombreCompleto(p)}`, d: ETIQ[inv.analisis.estado(p)], f: () => { ui.irProducto = p.id; ui.cerrar(); if (route.name !== 'app') router.push({ name: 'app' }) } }
  ))
  return c
}
// Sin texto: las acciones. Con texto: lo que coincida (productos primero), máximo 40.
const items = computed(() => {
  const t = norm(q.value.trim())
  const todos = comandos()
  return t ? todos.filter(c => norm(c.t + ' ' + c.g).includes(t)).sort((a, b) => (a.g === 'Productos' ? 0 : 1) - (b.g === 'Productos' ? 0 : 1)).slice(0, 40)
    : todos.filter(c => c.g !== 'Productos')
})
watch(q, () => { sel.value = 0 })
watch(sel, async () => { await nextTick(); lista.value && lista.value.querySelector('.cmd-item.activo')?.scrollIntoView({ block: 'nearest' }) })
function tecla (e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); sel.value = Math.min(items.value.length - 1, sel.value + 1) } else if (e.key === 'ArrowUp') { e.preventDefault(); sel.value = Math.max(0, sel.value - 1) } else if (e.key === 'Enter') { e.preventDefault(); ejecutar(sel.value) }
}
function ejecutar (i) { const c = items.value[i]; if (c) c.f() }
const muestraGrupo = i => i === 0 || items.value[i - 1].g !== items.value[i].g
</script>

<template>
  <Ventana ancho="cmd" sin-cabecera etiqueta="Buscar o ejecutar un comando" @cerrar="emit('cerrar')">
    <div class="cmd-buscar"><Icono n="search" /><input v-model="q" type="text" placeholder="¿Qué quieres hacer? Ej. vender leche, tema oscuro…" aria-label="Buscar comando" role="combobox" aria-controls="cmd-lista" :aria-activedescendant="items.length ? 'cmd-' + sel : undefined" aria-expanded="true" aria-autocomplete="list" autofocus @keydown="tecla"><kbd>Esc</kbd></div>
    <ul id="cmd-lista" ref="lista" class="cmd-lista" role="listbox">
      <template v-for="(c, i) in items" :key="c.g + c.t">
        <li v-if="muestraGrupo(i)" class="cmd-grupo" role="presentation">{{ c.g }}</li>
        <li :id="'cmd-' + i" class="cmd-item" :class="{ activo: i === sel }" role="option" :aria-selected="i === sel" @click="ejecutar(i)" @mousemove="sel = i">
          <span class="ico-c"><Icono :n="c.i" sm /></span><span>{{ c.t }}</span><small v-if="c.d">{{ c.d }}</small><kbd v-if="c.k">{{ c.k }}</kbd>
        </li>
      </template>
      <li v-if="!items.length" class="cmd-vacio">Sin resultados para "{{ q }}"</li>
    </ul>
    <div class="cmd-pie"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> elegir</span><span><kbd>Esc</kbd> cerrar</span></div>
  </Ventana>
</template>
