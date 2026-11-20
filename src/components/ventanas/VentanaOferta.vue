<!--
  CREAR OFERTA (desde una sugerencia "Haz una oferta")
  Muestra por qué conviene, el descuento sugerido (se puede cambiar) y un texto listo para copiar o mandar
  por WhatsApp (para el estado, un grupo de clientes o un letrero en la tienda).
-->
<script setup>
import { ref, computed } from 'vue'
import { useSesion } from '../../stores/sesion.js'
import { useAvisos } from '../../stores/avisos.js'
import { textoOferta } from '../../logica/sugerencias.js'
import { dinero } from '../../logica/formato.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const props = defineProps({ sugerencia: { type: Object, required: true } })
const emit = defineEmits(['cerrar'])
const sesion = useSesion()
const avisos = useAvisos()
const s = props.sugerencia
const pct = ref(s.datos.pct)
const precio = computed(() => (s.producto.precio ? Math.round(s.producto.precio * (100 - pct.value)) / 100 : null))
const texto = ref('')
const generar = () => { texto.value = textoOferta({ ...s, datos: { ...s.datos, pct: pct.value, precioOferta: precio.value } }, sesion.perfil.negocio) }
generar()
async function copiar () { try { await navigator.clipboard.writeText(texto.value); avisos.avisar('Texto de la oferta copiado', 'ok') } catch (e) { avisos.avisar('No se pudo copiar; selecciona el texto y cópialo.') } }
const whatsapp = () => window.open('https://wa.me/?text=' + encodeURIComponent(texto.value), '_blank', 'noopener,noreferrer')
</script>

<template>
  <Ventana titulo="Crear oferta" :subtitulo="s.producto.nombre" icono="gift" ancho="sm" @cerrar="emit('cerrar')">
    <p class="texto">{{ s.detalle }}</p>
    <div class="campo"><span>Descuento</span>
      <div class="seg">
        <button v-for="d in [10, 20, 30, 50]" :key="d" type="button" :aria-pressed="pct === d" @click="pct = d; generar()">{{ d === 50 ? '2×1' : d + ' %' }}</button>
      </div>
    </div>
    <div v-if="precio" class="previa">Precio de oferta <b>{{ dinero(precio) }}</b></div>
    <label>Mensaje para tus clientes<textarea v-model="texto" rows="4" maxlength="500" /></label>
    <div class="dlg-acciones">
      <button type="button" class="sec" @click="copiar"><Icono n="copy" sm />Copiar</button>
      <button type="button" @click="whatsapp"><Icono n="chat" sm />Enviar por WhatsApp</button>
    </div>
  </Ventana>
</template>
