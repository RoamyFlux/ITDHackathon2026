<!--
  ÍCONO DE RED SOCIAL CON SU LOGO Y COLOR ORIGINALES
  Los logotipos de marca vienen del paquete "simple-icons" (licencia CC0): son los trazos oficiales de cada
  marca y su color oficial. Correo, teléfono y sitio web usan íconos genéricos de la app.
  Instagram usa su degradado oficial (el color de simple-icons es solo el tono principal).
-->
<script setup>
import { computed } from 'vue'
import { siWhatsapp, siTelegram, siMessenger, siFacebook, siInstagram, siTiktok, siX, siYoutube } from 'simple-icons'
import Icono from './Icono.vue'

const props = defineProps({ red: { type: String, required: true }, grande: Boolean })
const MARCAS = { whatsapp: siWhatsapp, telegram: siTelegram, messenger: siMessenger, facebook: siFacebook, instagram: siInstagram, tiktok: siTiktok, x: siX, youtube: siYoutube }
const GENERICOS = { correo: ['mail', '#EA4335'], telefono: ['phone', '#16A34A'], web: ['monitor', '#4F46E5'] }
const marca = computed(() => MARCAS[props.red])
const color = computed(() => (marca.value ? '#' + marca.value.hex : (GENERICOS[props.red] || ['', '#64748b'])[1]))
</script>

<template>
  <span class="icono-red" :class="['r-' + red, { grande }]" :style="{ '--red': color }" aria-hidden="true">
    <svg v-if="marca" class="logo-marca" viewBox="0 0 24 24" role="img"><path :d="marca.path" /></svg>
    <Icono v-else :n="(GENERICOS[red] || ['help'])[0]" />
  </span>
</template>
