<!--
  GUÍA PARA INSTALAR LA APP (PWA)
  Pasos según el dispositivo: iPhone (Safari → Compartir → Agregar a inicio), Android (Chrome → menú →
  Instalar app) o computadora (Chrome/Edge → ícono de instalar). Si el navegador lo permite, botón de un clic.
-->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Icono from './Icono.vue'

const evento = ref(null)
const ua = navigator.userAgent
const instalada = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const android = /Android/.test(ua)
const guardar = e => { e.preventDefault(); evento.value = e }
onMounted(() => { addEventListener('beforeinstallprompt', guardar); if (window.__eventoInstalar) evento.value = window.__eventoInstalar })
onUnmounted(() => removeEventListener('beforeinstallprompt', guardar))
async function instalar () { evento.value.prompt(); await evento.value.userChoice; evento.value = null; window.__eventoInstalar = null }
</script>

<template>
  <div class="guia-instalar">
    <div v-if="instalada" class="nota"><Icono n="check" />Ya estás usando EarlyStock como app instalada.</div>
    <template v-else>
      <button v-if="evento" type="button" class="ancho" @click="instalar"><Icono n="download" sm />Instalar EarlyStock</button>
      <ol class="pasos">
        <template v-if="ios">
          <li>Abre esta página en <b>Safari</b>.</li>
          <li>Toca <b>Compartir</b> <span class="ic-inline"><Icono n="share" /></span>.</li>
          <li>Elige <b>"Agregar a inicio"</b> y toca <b>"Agregar"</b>.</li>
        </template>
        <template v-else-if="android">
          <li>Abre esta página en <b>Chrome</b>.</li>
          <li>Toca el menú <span class="ic-inline"><Icono n="more" /></span> (arriba a la derecha).</li>
          <li>Elige <b>"Instalar app"</b> o <b>"Agregar a la pantalla principal"</b>.</li>
        </template>
        <template v-else>
          <li>Abre esta página en <b>Chrome</b> o <b>Edge</b>.</li>
          <li>Haz clic en el ícono de instalar <span class="ic-inline"><Icono n="download" /></span> en la barra de direcciones (o menú <span class="ic-inline"><Icono n="more" /></span> → "Instalar EarlyStock").</li>
          <li>Se abrirá en su propia ventana, como cualquier programa.</li>
        </template>
      </ol>
    </template>
  </div>
</template>
