<!--
  SEGURIDAD (administración automática de la cuenta)
  1) Revisión automática: puntos que protegen la cuenta y su estado (correo, llave, inactividad, https).
  2) Llaves de acceso: agregar la de este dispositivo, renombrar y quitar.
  3) Sesiones: cerrar en los demás dispositivos y cierre automático por inactividad.
  4) Actividad reciente: bitácora (inicios de sesión, cambios, borrados…). La base anota sola lo delicado.
  5) Zona de peligro: eliminar mi cuenta y todos mis datos.
-->
<script setup>
import { ref, onMounted } from 'vue'
import { useSesion } from '../../stores/sesion.js'
import { useSeguridad, EVENTOS } from '../../stores/seguridad.js'
import { usePreferencias } from '../../stores/preferencias.js'
import { useAvisos } from '../../stores/avisos.js'
import { fechaHora } from '../../logica/formato.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const emit = defineEmits(['cerrar'])
const sesion = useSesion()
const seg = useSeguridad()
const prefs = usePreferencias()
const avisos = useAvisos()
const trabajando = ref(false)
const editando = ref(null)
const nombre = ref('')
const errorLlaves = ref('')

onMounted(async () => {
  seg.cargarEventos()
  if (!sesion.esDemo) {
    const e = await sesion.cargarPasskeys()
    if (e) errorLlaves.value = 'Las llaves de acceso aún no están activadas en el servidor (ver README: "Llaves de acceso").'
  }
})
async function hacer (fn, ok) {
  trabajando.value = true
  try { await fn(); if (ok) avisos.avisar(ok, 'ok'); seg.cargarEventos() } catch (e) { avisos.avisar(e.message) }
  trabajando.value = false
}
const agregar = () => hacer(() => sesion.agregarPasskey(), 'Llave de acceso agregada: ya puedes entrar con tu huella, rostro o PIN')
const renombrar = id => hacer(async () => { await sesion.renombrarPasskey(id, nombre.value); editando.value = null }, 'Nombre actualizado')
async function quitar (k) {
  if (await avisos.confirmar({ titulo: '¿Quitar esta llave de acceso?', mensaje: `"${k.friendly_name || 'Llave'}" ya no podrá usarse para entrar.`, boton: 'Quitar llave' })) hacer(() => sesion.borrarPasskey(k.id), 'Llave quitada')
}
async function otros () {
  if (await avisos.confirmar({ titulo: '¿Cerrar sesión en los demás dispositivos?', mensaje: 'Este dispositivo seguirá dentro. Los demás tendrán que volver a entrar.', boton: 'Cerrar en los demás', peligro: false })) hacer(() => sesion.salirDeOtros(), 'Listo: se cerró la sesión en los demás dispositivos')
}
async function eliminar () {
  const ok = await avisos.confirmar({ titulo: '¿Eliminar tu cuenta para siempre?', mensaje: 'Se borrarán tu cuenta, tu foto, todos tus productos, lotes, ventas y tu actividad. No se puede deshacer. Te sugerimos exportar tu inventario antes.', boton: 'Eliminar mi cuenta' })
  if (!ok) return
  const seguro = await avisos.confirmar({ titulo: 'Última confirmación', mensaje: 'Esta acción es definitiva.', boton: 'Sí, eliminar todo' })
  if (seguro) hacer(async () => { emit('cerrar'); await sesion.eliminarCuenta() }, 'Tu cuenta y tus datos se eliminaron.')
}
</script>

<template>
  <Ventana titulo="Seguridad" subtitulo="Tu cuenta se revisa sola; aquí ves y ajustas todo" icono="shield" ancho="lg" @cerrar="emit('cerrar')">
    <div class="seg-rejilla">
      <section class="card-in">
        <h3><Icono n="check" sm />Revisión automática <span class="contador" :class="seg.puntaje === seg.revision.length ? 'ok' : 'low'">{{ seg.puntaje }}/{{ seg.revision.length }}</span></h3>
        <ul class="revision">
          <li v-for="r in seg.revision" :key="r.id" :class="r.ok ? 'ok' : 'low'"><Icono :n="r.ok ? 'check' : 'alert'" sm /><span><b>{{ r.t }}</b><small>{{ r.d }}</small></span></li>
        </ul>
      </section>

      <section class="card-in">
        <h3><Icono n="finger" sm />Llaves de acceso</h3>
        <p class="hint">Entra con tu huella, rostro o el PIN de tu dispositivo. Es más seguro que una contraseña: no se puede adivinar ni robar con un correo falso.</p>
        <p v-if="sesion.esDemo" class="nota">Disponible con una cuenta real.</p>
        <p v-else-if="!sesion.soportaPasskeys" class="nota">Este navegador no admite llaves de acceso. Prueba con Chrome, Safari o Edge actualizados.</p>
        <template v-else>
          <p v-if="errorLlaves" class="nota low">{{ errorLlaves }}</p>
          <ul v-if="sesion.passkeys.length" class="llaves">
            <li v-for="k in sesion.passkeys" :key="k.id">
              <Icono n="key" />
              <form v-if="editando === k.id" class="renombrar" @submit.prevent="renombrar(k.id)"><input v-model="nombre" maxlength="120" required aria-label="Nombre de la llave"><button type="submit" class="sm">Guardar</button></form>
              <span v-else><b>{{ k.friendly_name || 'Llave de acceso' }}</b><small>Creada {{ fechaHora(Date.parse(k.created_at)) }}<template v-if="k.last_used_at"> · usada {{ fechaHora(Date.parse(k.last_used_at)) }}</template></small></span>
              <button v-if="editando !== k.id" type="button" class="ghost icono sm" aria-label="Renombrar" title="Renombrar" @click="editando = k.id; nombre = k.friendly_name || ''"><Icono n="edit" sm /></button>
              <button type="button" class="ghost icono sm" aria-label="Quitar llave" title="Quitar" @click="quitar(k)"><Icono n="trash" sm /></button>
            </li>
          </ul>
          <button type="button" class="ancho" :disabled="trabajando" @click="agregar"><Icono n="plus" sm />Agregar llave en este dispositivo</button>
        </template>
      </section>

      <section class="card-in">
        <h3><Icono n="phone" sm />Sesiones</h3>
        <p class="hint">Cerrar la sesión sola si nadie usa la app:</p>
        <div class="seg compacto" role="group" aria-label="Cierre por inactividad">
          <button v-for="m in [0, 15, 30, 60, 120]" :key="m" type="button" :aria-pressed="prefs.prefs.inactividad === m" @click="prefs.cambiar('inactividad', m)">{{ m ? (m < 60 ? m + ' min' : m / 60 + ' h') : 'Nunca' }}</button>
        </div>
        <button v-if="!sesion.esDemo" type="button" class="sec ancho" :disabled="trabajando" @click="otros"><Icono n="logout" sm />Cerrar sesión en los demás dispositivos</button>
      </section>

      <section class="card-in actividad">
        <h3><Icono n="activity" sm />Actividad reciente</h3>
        <p v-if="seg.errorEventos" class="nota low">{{ seg.errorEventos }}</p>
        <ul v-else-if="seg.eventos.length" class="eventos">
          <li v-for="e in seg.eventos.slice(0, 15)" :key="e.id"><Icono :n="(EVENTOS[e.tipo] || {}).i || 'activity'" sm /><span><b>{{ (EVENTOS[e.tipo] || {}).t || e.tipo }}</b><small>{{ e.detalle }}</small></span><time>{{ fechaHora(Date.parse(e.created_at)) }}</time></li>
        </ul>
        <p v-else class="hint">Aún no hay actividad registrada.</p>
        <p class="hint">Si ves algo que no fuiste tú, cambia tu contraseña y cierra sesión en los demás dispositivos.</p>
      </section>
    </div>

    <section class="peligro-zona">
      <div><b>Eliminar mi cuenta</b><small>Borra tu cuenta y todos tus datos para siempre (derecho de cancelación).</small></div>
      <button type="button" class="peligro sm" :disabled="trabajando" @click="eliminar"><Icono n="trash" sm />Eliminar cuenta</button>
    </section>
  </Ventana>
</template>
