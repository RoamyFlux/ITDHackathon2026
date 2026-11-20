<!--
  DISEÑO DE LAS PÁGINAS LEGALES (Aviso de Privacidad y Términos de Uso)
  Barra simple con logo y botón para volver, índice de secciones y el texto. Los datos marcados entre
  corchetes, como [Nombre del responsable], los debe llenar el equipo antes de publicar la app.
-->
<script setup>
import { useSesion } from '../stores/sesion.js'
import Icono from './Icono.vue'
import Pie from './Pie.vue'

defineProps({ titulo: String, actualizado: String, secciones: Array })
const sesion = useSesion()
const ir = id => document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

<template>
  <div class="legal">
    <header class="nav-inicio legal-nav">
      <router-link class="marca" :to="{ path: '/', query: { ver: 1 } }"><svg aria-hidden="true"><use href="#logo" /></svg><span class="nombre">Early<span>Stock</span></span></router-link>
      <router-link :to="sesion.dentro ? '/app' : '/'" class="btn-link"><Icono n="arrow" sm />{{ sesion.dentro ? 'Volver a mi inventario' : 'Volver al inicio' }}</router-link>
    </header>
    <main class="legal-main">
      <aside class="legal-indice card">
        <b>Contenido</b>
        <a v-for="s in secciones" :key="s.id" :href="'#' + s.id" @click.prevent="ir(s.id)">{{ s.t }}</a>
      </aside>
      <article class="legal-texto card">
        <h1>{{ titulo }}</h1>
        <p class="actualizado">Última actualización: {{ actualizado }}</p>
        <div class="banner low"><Icono n="alert" />Plantilla del proyecto: los datos entre corchetes deben completarse y el texto debe revisarlo un asesor legal antes de usar la app con clientes reales.</div>
        <slot />
      </article>
    </main>
    <Pie />
  </div>
</template>
