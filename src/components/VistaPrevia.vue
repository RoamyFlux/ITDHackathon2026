<!--
  VISTA PREVIA ANIMADA (página de inicio)
  Una "maqueta" de la app hecha con HTML y CSS (no es una imagen): el anillo se llena, las barras crecen,
  aparecen las alertas y una sugerencia de oferta, una tras otra. Los datos son de una tienda de ejemplo.
-->
<script setup>
import Icono from './Icono.vue'
</script>

<template>
  <div class="previa-app" aria-hidden="true">
    <div class="pa-barra"><i /><i /><i /><span>earlystock</span></div>
    <div class="pa-cuerpo">
      <div class="pa-hola">
        <div><small>Hola,</small><b>Abarrotes La Esquina</b></div>
        <div class="pa-anillo"><svg viewBox="0 0 64 64"><circle class="pista" cx="32" cy="32" r="27" /><circle class="valor" cx="32" cy="32" r="27" /></svg><span>38%</span></div>
      </div>
      <div class="pa-stats">
        <div><small>Urgentes</small><b class="crit">2</b></div>
        <div><small>Por caducar</small><b class="low">3</b></div>
        <div><small>Por comprar</small><b>4</b></div>
      </div>
      <div class="pa-alerta pa-a1"><span class="dot crit" /><b>Refresco 600 ml</b><em>15 pzas · ~1 día</em></div>
      <div class="pa-alerta pa-a2"><span class="dot low" /><b>Leche 1 L</b><em>caduca en 3 días</em></div>
      <div class="pa-sugerencia"><span class="pa-ico"><Icono n="gift" sm /></span><div><b>Haz una oferta de Huevo</b><small>20 pzas no se venderán a tiempo: 20 % de descuento</small></div></div>
      <div class="pa-grafica"><i v-for="n in 7" :key="n" :class="'b' + n" /></div>
    </div>
    <div class="pa-flotante pa-f1"><Icono n="bell" sm />Se acaba: Refresco</div>
    <div class="pa-flotante pa-f2"><Icono n="chat" sm />Lista enviada por WhatsApp</div>
  </div>
</template>
