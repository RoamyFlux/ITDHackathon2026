<!--
  ENCABEZADO DEL PANEL (cápsula de cristal flotante)
  Logo · buscar/comandos (Ctrl+K) · notificaciones · cambiar tema · PLAN (insignia plata/oro) · Admin (solo administrador) ·
  ayuda y soporte ·
  configuración · perfil.
-->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { useUI } from '../stores/ui.js'
import { usePreferencias } from '../stores/preferencias.js'
import Icono from './Icono.vue'
import Avatar from './Avatar.vue'
import CentroNotificaciones from './CentroNotificaciones.vue'
import { useSoporte } from '../stores/soporte.js'
import { usePlan } from '../stores/plan.js'
import InsigniaPlan from './InsigniaPlan.vue'

const sesion = useSesion()
const ui = useUI()
const prefs = usePreferencias()
const soporte = useSoporte()
const plan = usePlan()

// Al bajar en la página, el encabezado se vuelve más opaco (clase "scrolled").
const bajo = ref(false)
const alScroll = () => { bajo.value = scrollY > 8 }
// Ctrl+K (Cmd+K en Mac): abre o cierra la paleta de comandos en cualquier página con encabezado (panel y Admin).
// No reemplaza otra ventana abierta: así no se pierde un formulario a medias.
function atajoComandos (e) {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'k') return
  e.preventDefault()
  if (ui.ventana && ui.ventana.tipo === 'comandos') ui.cerrar()
  else if (!document.querySelector('dialog[open]')) ui.abrir('comandos')
}
onMounted(() => { addEventListener('scroll', alScroll, { passive: true }); addEventListener('keydown', atajoComandos) })
onUnmounted(() => { removeEventListener('scroll', alScroll); removeEventListener('keydown', atajoComandos) })

// Cambio rápido de tema: si se ve oscuro pasa a Claro; si se ve claro pasa a Oscuro.
const alternarTema = () => prefs.cambiar('tema', prefs.esOscuro() ? 'light' : 'dark')
</script>

<template>
  <header class="top" :class="{ scrolled: bajo }">
    <div class="top-in">
      <router-link class="marca" :to="{ path: '/', query: { ver: 1 } }" aria-label="EarlyStock, página de inicio">
        <svg aria-hidden="true"><use href="#logo" /></svg><span class="nombre">Early<span>Stock</span></span>
      </router-link>
      <div class="top-der">
        <button type="button" class="btn-top cmd-abrir" title="Buscar o ejecutar (Ctrl + K)" @click="ui.abrir('comandos')">
          <Icono n="search" sm /><span class="txt-cmd">Buscar o ejecutar…</span><span class="teclas"><kbd>Ctrl</kbd><kbd>K</kbd></span>
        </button>
        <CentroNotificaciones />
        <button type="button" class="btn-top icono ocultar-movil" :aria-label="prefs.esOscuro() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'" :title="prefs.esOscuro() ? 'Tema claro' : 'Tema oscuro'" @click="alternarTema"><Icono :n="prefs.esOscuro() ? 'sun' : 'moon'" /></button>
        <!-- Botón de PLAN: siempre visible. En Gratis invita a mejorar; en Pro/Max muestra su insignia. -->
        <button type="button" class="btn-top plan-btn" :class="'p-' + plan.planId" :title="'Tu plan: ' + plan.plan.nombre + ' · ver planes'" @click="ui.abrir('planes')">
          <template v-if="plan.planId === 'gratis'"><Icono n="star" sm /><span class="ocultar-movil">Mejorar plan</span></template>
          <InsigniaPlan v-else :plan="plan.planId" />
        </button>
        <router-link v-if="soporte.esAdmin || plan.esAdmin" to="/admin" class="btn-top admin-btn" title="Administración"><Icono n="shield" sm /><span class="ocultar-movil">Admin</span></router-link>
        <router-link v-if="$route.name !== 'app'" to="/app" class="btn-top icono" title="Mi inventario" aria-label="Mi inventario"><Icono n="box" /></router-link>
        <button type="button" class="btn-top icono ocultar-chico" aria-label="Ayuda y soporte" title="Ayuda y soporte" @click="ui.abrir('soporte')"><Icono n="help" /></button>
        <button type="button" class="btn-top icono ocultar-chico" aria-label="Configuración" title="Configuración" @click="ui.abrir('configuracion')"><Icono n="gear" /></button>
        <button type="button" class="btn-perfil" title="Mi perfil y seguridad" @click="ui.abrir('perfil')">
          <Avatar />
          <!-- Aquí solo la corona del admin: la insignia del plan ya está en el botón de plan. -->
          <span class="txt"><span class="nombre-linea"><b>{{ sesion.perfil.negocio || 'Mi negocio' }}</b><InsigniaPlan plan="gratis" :admin="soporte.esAdmin || plan.esAdmin" /></span><small>{{ sesion.esDemo ? 'Demostración' : sesion.perfil.email }}</small></span>
        </button>
      </div>
    </div>
  </header>
</template>
