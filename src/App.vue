<!--
  APP (raíz)
  - Dibuja la página actual (router-view), los avisos y la ventana emergente abierta (store "ui").
  - Cambia de página sola al entrar o salir de la sesión.
  - Pide aceptar los Términos y el Aviso de Privacidad si la cuenta no los ha aceptado (o si cambiaron).
  - Abre "crear contraseña nueva" al volver desde el correo de recuperación.
-->
<script setup>
import { watch, defineAsyncComponent, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSesion } from './stores/sesion.js'
import { useUI } from './stores/ui.js'
import { useSeguridad } from './stores/seguridad.js'
import SpriteIconos from './components/SpriteIconos.vue'
import Avisos from './components/Avisos.vue'
import AceptarPoliticas from './components/AceptarPoliticas.vue'

const sesion = useSesion()
const ui = useUI()
const router = useRouter()
const route = useRoute()
useSeguridad().vigilarInactividad()

// Cada ventana se descarga solo cuando se abre por primera vez (la app inicial pesa menos).
const VENTANAS = {
  producto: defineAsyncComponent(() => import('./components/ventanas/VentanaProducto.vue')),
  movimiento: defineAsyncComponent(() => import('./components/ventanas/VentanaMovimiento.vue')),
  perfil: defineAsyncComponent(() => import('./components/ventanas/VentanaPerfil.vue')),
  seguridad: defineAsyncComponent(() => import('./components/ventanas/VentanaSeguridad.vue')),
  configuracion: defineAsyncComponent(() => import('./components/ventanas/VentanaConfiguracion.vue')),
  importar: defineAsyncComponent(() => import('./components/ventanas/VentanaImportar.vue')),
  contrasena: defineAsyncComponent(() => import('./components/ventanas/VentanaContrasena.vue')),
  comandos: defineAsyncComponent(() => import('./components/ventanas/PaletaComandos.vue')),
  atajos: defineAsyncComponent(() => import('./components/ventanas/VentanaAtajos.vue')),
  guia: defineAsyncComponent(() => import('./components/ventanas/GuiaRapida.vue')),
  oferta: defineAsyncComponent(() => import('./components/ventanas/VentanaOferta.vue')),
  soporte: defineAsyncComponent(() => import('./components/ventanas/VentanaSoporte.vue'))
}
const actual = computed(() => ui.ventana && VENTANAS[ui.ventana.tipo])

// Entrar -> al panel. Salir -> a la página de inicio (y se cierra cualquier ventana abierta).
watch(() => sesion.dentro, dentro => {
  if (dentro && route.name === 'inicio') router.push({ name: 'app' })
  if (!dentro) { ui.cerrar(); if (route.meta.requiereSesion) router.push({ name: 'inicio' }) }
})
// Volvió desde el correo de recuperación: pedir la contraseña nueva.
watch(() => sesion.recuperando && sesion.modo === 'dentro', r => { if (r) ui.abrir('contrasena', { desdeCorreo: true }) }, { immediate: true })
</script>

<template>
  <SpriteIconos />
  <div v-if="sesion.modo === 'cargando'" id="splash" role="status" aria-label="Cargando">
    <div class="splash-in">
      <svg class="splash-logo" viewBox="0 0 64 64" aria-hidden="true"><use href="#logo" /></svg>
      <b>Early<span>Stock</span></b>
      <div class="splash-barra"><i /></div>
    </div>
  </div>
  <router-view v-else />
  <component :is="actual" v-if="actual" :key="ui.ventana.id" v-bind="ui.ventana.datos" @cerrar="ui.cerrar()" />
  <AceptarPoliticas v-if="sesion.debeAceptarPoliticas && route.name === 'app'" />
  <Avisos />
</template>
