<!--
  FORMULARIO DE ACCESO (en la página de inicio)
  Pestañas:
    entrar     -> correo + contraseña, o "Entrar con llave de acceso" (huella, rostro o PIN)
    crear      -> nombre del negocio, correo real, contraseña propia (8+, letras y números) y aceptar políticas
    recuperar  -> manda un correo con enlace para crear una contraseña nueva
    revisa     -> "Revisa tu correo": después de crear la cuenta, con botón para reenviar (cada 60 s)
-->
<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { useAvisos } from '../stores/avisos.js'
import { validarContrasena, validarCorreo } from '../logica/validacion.js'
import { dominioRecibeCorreo } from '../lib/correo.js'
import Icono from './Icono.vue'
import CampoContrasena from './CampoContrasena.vue'

const props = defineProps({ pestana: { type: String, default: 'entrar' } })
const emit = defineEmits(['update:pestana'])
const sesion = useSesion()
const avisos = useAvisos()

const tab = computed({ get: () => props.pestana, set: v => emit('update:pestana', v) })
const f = ref({ email: '', password: '', password2: '', negocio: '', acepto: false })
const enviando = ref(false)
const error = ref('')

// Validación en vivo (solo se muestra cuando ya escribieron algo).
const vCorreo = computed(() => validarCorreo(f.value.email))
const vClave = computed(() => validarContrasena(f.value.password))
const coinciden = computed(() => f.value.password === f.value.password2)
// ¿El dominio del correo recibe mensajes? Se revisa 0.6 s después de dejar de escribir (ver lib/correo.js).
const dominio = ref('') // '' | 'revisando' | 'si' | 'no' | 'desconocido'
let tDominio = null
watch(() => [f.value.email, props.pestana], () => {
  clearTimeout(tDominio)
  dominio.value = ''
  if (props.pestana !== 'crear' || !vCorreo.value.ok) return
  const d = f.value.email.trim().toLowerCase().split('@')[1]
  dominio.value = 'revisando'
  tDominio = setTimeout(async () => {
    const r = await dominioRecibeCorreo(d)
    if (f.value.email.trim().toLowerCase().split('@')[1] === d) dominio.value = r
  }, 600)
})
const puedeCrear = computed(() => vCorreo.value.ok && !['no', 'revisando'].includes(dominio.value) && vClave.value.ok && coinciden.value && f.value.acepto)

// Reenviar confirmación: se espera 60 s entre envíos.
const espera = ref(0)
let reloj = null
function iniciarEspera () {
  espera.value = 60
  clearInterval(reloj)
  reloj = setInterval(() => { if (--espera.value <= 0) clearInterval(reloj) }, 1000)
}
onUnmounted(() => { clearInterval(reloj); clearTimeout(tDominio) })

async function ejecutar (fn) {
  error.value = ''
  enviando.value = true
  try { await fn() } catch (e) { error.value = e.message || String(e) }
  enviando.value = false
}
const entrar = () => ejecutar(() => sesion.entrar(f.value.email, f.value.password))
const entrarLlave = () => ejecutar(() => sesion.entrarConLlave())
const crear = () => ejecutar(async () => {
  if (!puedeCrear.value) throw new Error('Revisa los datos marcados.')
  const r = await sesion.registrar({ email: f.value.email, password: f.value.password, negocio: f.value.negocio })
  if (r.pendiente) { tab.value = 'revisa'; iniciarEspera() }
})
const reenviar = () => ejecutar(async () => { await sesion.reenviarConfirmacion(f.value.email); iniciarEspera(); avisos.avisar('Te enviamos otro correo de confirmación.', 'ok') })
const recuperar = () => ejecutar(async () => { await sesion.recuperar(f.value.email); avisos.avisar('Si el correo tiene cuenta, te llegará un enlace para crear una contraseña nueva.', 'ok'); tab.value = 'entrar' })
const usarSugerencia = () => { f.value.email = vCorreo.value.sugerencia }
</script>

<template>
  <div class="card acceso">
    <div v-if="!sesion.configurado" class="banner low"><Icono n="sliders" />Falta conectar Supabase (config/supabase.json). Mientras, puedes usar la demostración.</div>

    <div v-if="tab !== 'revisa'" class="seg pestanas" role="tablist">
      <button type="button" role="tab" :aria-pressed="tab === 'entrar'" :aria-selected="tab === 'entrar'" @click="tab = 'entrar'; error = ''">Entrar</button>
      <button type="button" role="tab" :aria-pressed="tab === 'crear'" :aria-selected="tab === 'crear'" @click="tab = 'crear'; error = ''">Crear cuenta</button>
    </div>

    <!-- ENTRAR -->
    <form v-if="tab === 'entrar'" class="form-acceso" @submit.prevent="entrar">
      <h3>Qué gusto verte</h3>
      <p class="sub">Entra para ver cómo va tu inventario hoy.</p>
      <button v-if="sesion.soportaPasskeys" type="button" class="llave" :disabled="enviando || !sesion.configurado" @click="entrarLlave">
        <Icono n="finger" />Entrar con llave de acceso<small>Huella, rostro o PIN de tu dispositivo</small>
      </button>
      <div v-if="sesion.soportaPasskeys" class="separador"><span>o con tu correo</span></div>
      <label>Correo<input v-model="f.email" type="email" name="email" autocomplete="username webauthn" required maxlength="254" placeholder="tu@correo.com"></label>
      <CampoContrasena v-model="f.password" etiqueta="Contraseña" autocomplete="current-password" />
      <p v-if="error" class="error-form" role="alert"><Icono n="alert" sm />{{ error }}</p>
      <button type="submit" class="ancho" :disabled="enviando || !sesion.configurado">{{ enviando ? 'Entrando…' : 'Entrar' }}<Icono n="arrow" sm /></button>
      <button type="button" class="enlace" @click="tab = 'recuperar'; error = ''">¿Olvidaste tu contraseña?</button>
    </form>

    <!-- CREAR CUENTA -->
    <form v-else-if="tab === 'crear'" class="form-acceso" novalidate @submit.prevent="crear">
      <h3>Crea tu cuenta</h3>
      <p class="sub">Te enviaremos un correo para confirmar que es tuyo.</p>
      <label>Nombre de tu negocio <small>(opcional)</small><input v-model="f.negocio" type="text" maxlength="60" autocomplete="organization" placeholder="Ej. Abarrotes Don Pepe"></label>
      <label>Correo
        <input v-model="f.email" type="email" autocomplete="email" required maxlength="254" placeholder="tu@correo.com" :aria-invalid="!!f.email && !vCorreo.ok">
      </label>
      <p v-if="f.email && !vCorreo.ok" class="pista mal">{{ vCorreo.motivo }}</p>
      <p v-else-if="vCorreo.sugerencia" class="pista">¿Quisiste decir <button type="button" class="enlace en-linea" @click="usarSugerencia">{{ vCorreo.sugerencia }}</button>?</p>
      <p v-else-if="dominio === 'revisando'" class="pista">Revisando que el correo pueda recibir mensajes…</p>
      <p v-else-if="dominio === 'no'" class="pista mal">Ese correo no existe: "{{ f.email.split('@')[1] }}" no recibe mensajes. Revisa que esté bien escrito.</p>
      <p v-else-if="dominio === 'si' && !vCorreo.sugerencia" class="pista ok-txt"><Icono n="check" sm /> El correo puede recibir mensajes. Te enviaremos un enlace para confirmarlo.</p>
      <CampoContrasena v-model="f.password" etiqueta="Crea una contraseña" autocomplete="new-password" con-reglas />
      <CampoContrasena v-model="f.password2" etiqueta="Repite la contraseña" autocomplete="new-password" />
      <p v-if="f.password2 && !coinciden" class="pista mal">Las contraseñas no coinciden.</p>
      <label class="check"><input v-model="f.acepto" type="checkbox" required>
        <span>Acepto los <router-link to="/terminos">Términos de Uso</router-link> y el <router-link to="/privacidad">Aviso de Privacidad</router-link>.</span></label>
      <p v-if="error" class="error-form" role="alert"><Icono n="alert" sm />{{ error }}</p>
      <button type="submit" class="ancho" :disabled="enviando || !puedeCrear || !sesion.configurado">{{ enviando ? 'Creando…' : 'Crear mi cuenta' }}<Icono n="arrow" sm /></button>
    </form>

    <!-- RECUPERAR -->
    <form v-else-if="tab === 'recuperar'" class="form-acceso" @submit.prevent="recuperar">
      <h3>Recupera tu acceso</h3>
      <p class="sub">Escribe tu correo y te mandaremos un enlace para crear una contraseña nueva.</p>
      <label>Correo<input v-model="f.email" type="email" autocomplete="email" required maxlength="254" placeholder="tu@correo.com"></label>
      <p v-if="error" class="error-form" role="alert"><Icono n="alert" sm />{{ error }}</p>
      <button type="submit" class="ancho" :disabled="enviando">Enviar enlace<Icono n="mail" sm /></button>
      <button type="button" class="enlace" @click="tab = 'entrar'; error = ''">Volver a entrar</button>
    </form>

    <!-- REVISA TU CORREO -->
    <div v-else class="form-acceso revisa">
      <div class="ico-correo"><Icono n="mail" /></div>
      <h3>Revisa tu correo</h3>
      <p class="sub">Enviamos un enlace a <b>{{ f.email }}</b>. Ábrelo para confirmar tu cuenta y entrarás directo a EarlyStock.</p>
      <ul class="tips">
        <li>Si no lo ves en unos minutos, busca en <b>Spam</b> o <b>Promociones</b>.</li>
        <li>El enlace funciona una sola vez.</li>
      </ul>
      <p v-if="error" class="error-form" role="alert"><Icono n="alert" sm />{{ error }}</p>
      <button type="button" class="sec ancho" :disabled="espera > 0 || enviando" @click="reenviar">{{ espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar correo' }}</button>
      <button type="button" class="enlace" @click="tab = 'entrar'">Ya lo confirmé: entrar</button>
    </div>

    <div class="seguro"><Icono n="lock" sm />Conexión cifrada. Solo tu cuenta puede ver tus datos.</div>
  </div>
</template>
