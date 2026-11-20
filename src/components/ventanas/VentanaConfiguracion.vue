<!--
  CONFIGURACIÓN (en bloques plegables para no deslizar de más: Apariencia, Avisos e Instalar como app)
  Tema (Claro, Niebla, Grafito, Oscuro, Automático) · color de acento · densidad · animaciones ·
  días de aviso de caducidad · notificaciones del navegador · cómo instalar la app · restablecer.
-->
<script setup>
import { ref, computed } from 'vue'
import { usePreferencias, TEMAS, ACENTOS } from '../../stores/preferencias.js'
import { useAvisos } from '../../stores/avisos.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'
import GuiaInstalar from '../GuiaInstalar.vue'
import Plegable from '../Plegable.vue'

const emit = defineEmits(['cerrar'])
const ps = usePreferencias()
const avisos = useAvisos()
const p = computed(() => ps.prefs)
const permiso = ref('Notification' in window ? Notification.permission : 'no')

/* Notificaciones del navegador: piden permiso UNA vez. Con permiso, al abrir la app se muestra un resumen
 * de pendientes como máximo una vez al día. (Para avisos con la app cerrada haría falta un servidor de "push".) */
async function alternarNotificaciones () {
  if (p.value.notificaciones) return ps.cambiar('notificaciones', false)
  if (permiso.value === 'no') return avisos.avisar('Este navegador no permite notificaciones.')
  permiso.value = await Notification.requestPermission()
  if (permiso.value === 'granted') {
    ps.cambiar('notificaciones', true)
    new Notification('EarlyStock', { body: 'Listo: te avisaremos de lo urgente una vez al día al abrir la app.', icon: 'icon-192.png' })
  } else avisos.avisar('No se dio permiso. Puedes activarlo en la configuración del navegador (ícono del candado junto a la dirección).')
}
function restablecer () { ps.restablecer(); avisos.avisar('Configuración restablecida', 'ok') }
</script>

<template>
  <Ventana titulo="Configuración" subtitulo="Se guarda en tu cuenta y se aplica en tus dispositivos" icono="gear" ancho="md" @cerrar="emit('cerrar')">
    <Plegable titulo="Apariencia" icono="palette" resumen="Tema, color, densidad y animaciones" abierto recordar="config-apariencia" clase="grupo-ajustes">
    <div class="ajuste">
      <h3>Tema</h3>
      <p>Elige qué tan claro u oscuro quieres ver EarlyStock. Niebla y Grafito son grises: ni tan blanco ni tan negro.</p>
      <div class="temas">
        <button v-for="t in TEMAS" :key="t.v" type="button" class="tema-op" :class="'t-' + t.v" :aria-pressed="p.tema === t.v" @click="ps.cambiar('tema', t.v)">
          <i class="muestra"><span /><span /><span /></i><span><Icono :n="t.icono" sm />{{ t.t }}</span>
        </button>
      </div>
    </div>
    <div class="ajuste">
      <h3>Color</h3>
      <p>Paleta de botones y detalles.</p>
      <div class="swatches">
        <button v-for="a in ACENTOS" :key="a.v" type="button" class="swatch" :class="'s-' + a.v" :aria-pressed="p.acento === a.v" @click="ps.cambiar('acento', a.v)"><i />{{ a.t }}</button>
      </div>
    </div>
    <div class="ajuste fila2">
      <div>
        <h3>Densidad</h3>
        <div class="seg">
          <button type="button" :aria-pressed="p.densidad === 'comoda'" @click="ps.cambiar('densidad', 'comoda')">Cómoda</button>
          <button type="button" :aria-pressed="p.densidad === 'compact'" @click="ps.cambiar('densidad', 'compact')">Compacta</button>
        </div>
      </div>
      <div>
        <h3>Animaciones</h3>
        <div class="seg">
          <button type="button" :aria-pressed="p.movimiento === 'on'" @click="ps.cambiar('movimiento', 'on')">Activadas</button>
          <button type="button" :aria-pressed="p.movimiento === 'off'" @click="ps.cambiar('movimiento', 'off')">Reducidas</button>
        </div>
      </div>
    </div>
    </Plegable>
    <Plegable titulo="Avisos" icono="bell" resumen="Caducidad y notificaciones del navegador" recordar="config-avisos" clase="grupo-ajustes">
    <div class="ajuste">
      <h3>Avisar caducidad con</h3>
      <p>Días de anticipación para marcar un lote "Por caducar" y sugerir ofertas.</p>
      <div class="seg">
        <button v-for="d in [3, 5, 7, 10, 15]" :key="d" type="button" :aria-pressed="p.diasAviso === d" @click="ps.cambiar('diasAviso', d)">{{ d }} días</button>
      </div>
    </div>
    <div class="ajuste">
      <h3>Notificaciones</h3>
      <p>Un resumen de lo urgente (lo que se acaba, caduca u ofertas sugeridas) al abrir la app, máximo una vez al día.</p>
      <button type="button" class="interruptor" role="switch" :aria-checked="p.notificaciones" @click="alternarNotificaciones"><i /><span>{{ p.notificaciones ? 'Activadas' : 'Desactivadas' }}</span></button>
      <p v-if="permiso === 'denied'" class="nota low">El navegador bloqueó las notificaciones de esta página.</p>
    </div>
    </Plegable>
    <Plegable titulo="Instalar como app" icono="phone" resumen="En tu celular o computadora" recordar="config-instalar" clase="grupo-ajustes">
      <div id="ajuste-instalar" class="ajuste"><GuiaInstalar /></div>
    </Plegable>
    <div class="dlg-acciones">
      <button type="button" class="ghost" @click="restablecer"><Icono n="refresh" sm />Restablecer</button>
      <button type="button" @click="emit('cerrar')">Listo</button>
    </div>
  </Ventana>
</template>
