<!--
  ENCABEZADO DEL PANEL (cápsula de cristal flotante)
  Logo · buscar/comandos (Ctrl+K) · notificaciones · cambiar tema · Admin (solo administrador) · ayuda y soporte ·
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

const sesion = useSesion()
const ui = useUI()
const prefs = usePreferencias()
const soporte = useSoporte()

// Al bajar en la página, el encabezado se vuelve más opaco (clase "scrolled").
const bajo = ref(false)
const alScroll = () => { bajo.value = scrollY > 8 }
onMounted(() => addEventListener('scroll', alScroll, { passive: true }))
onUnmounted(() => removeEventListener('scroll', alScroll))

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
        <router-link v-if="soporte.esAdmin" to="/admin" class="btn-top admin-btn" title="Administración"><Icono n="shield" sm /><span class="ocultar-movil">Admin</span></router-link>
        <router-link v-if="$route.name !== 'app'" to="/app" class="btn-top icono" title="Mi inventario" aria-label="Mi inventario"><Icono n="box" /></router-link>
        <button type="button" class="btn-top icono" aria-label="Ayuda y soporte" title="Ayuda y soporte" @click="ui.abrir('soporte')"><Icono n="help" /></button>
        <button type="button" class="btn-top icono" aria-label="Configuración" title="Configuración" @click="ui.abrir('configuracion')"><Icono n="gear" /></button>
        <button type="button" class="btn-perfil" title="Mi perfil y seguridad" @click="ui.abrir('perfil')">
          <Avatar />
          <span class="txt"><b>{{ sesion.perfil.negocio || 'Mi negocio' }}</b><small>{{ sesion.esDemo ? 'Demostración' : sesion.perfil.email }}</small></span>
        </button>
      </div>
    </div>
  </header>
</template>
