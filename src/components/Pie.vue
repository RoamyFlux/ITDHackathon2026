<!-- PIE DE PÁGINA: marca, enlaces a las políticas, ayuda y soporte y aviso del hackathon. -->
<script setup>
import { useUI } from '../stores/ui.js'
const ui = useUI()
</script>

<template>
  <footer class="foot">
    <span class="foot-marca"><svg aria-hidden="true"><use href="#logo" /></svg>EarlyStock</span>
    <nav aria-label="Enlaces del pie de página">
      <router-link to="/privacidad">Aviso de Privacidad</router-link>
      <router-link to="/terminos">Términos de Uso</router-link>
      <a href="#" @click.prevent="ui.abrir('soporte')">Ayuda y soporte</a>
      <router-link :to="{ path: '/', query: { ver: 1 } }">Inicio</router-link>
    </nav>
    <small>Hackathon ITD 2026 · Comercio y emprendimiento local</small>
  </footer>
</template>
