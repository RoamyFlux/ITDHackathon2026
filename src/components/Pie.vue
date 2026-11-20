<!-- PIE DE PÁGINA: marca, enlaces a las políticas y aviso del hackathon. -->
<template>
  <footer class="foot">
    <span class="foot-marca"><svg aria-hidden="true"><use href="#logo" /></svg>EarlyStock</span>
    <nav aria-label="Políticas">
      <router-link to="/privacidad">Aviso de Privacidad</router-link>
      <router-link to="/terminos">Términos de Uso</router-link>
      <router-link :to="{ path: '/', query: { ver: 1 } }">Inicio</router-link>
    </nav>
    <small>Hackathon ITD 2026 · Comercio y emprendimiento local</small>
  </footer>
</template>
