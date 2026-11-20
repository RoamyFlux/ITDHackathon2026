<!--
  MI PERFIL
  Foto (se recorta a un cuadrado de 256×256 en JPG antes de subirla: pesa poco y no lleva datos ocultos
  de la cámara como la ubicación), nombre del negocio y accesos a Seguridad, contraseña, políticas y salir.
-->
<script setup>
import { ref } from 'vue'
import { useSesion } from '../../stores/sesion.js'
import { useAvisos } from '../../stores/avisos.js'
import { useUI } from '../../stores/ui.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'
import Avatar from '../Avatar.vue'

const emit = defineEmits(['cerrar'])
const sesion = useSesion()
const avisos = useAvisos()
const ui = useUI()
const negocio = ref(sesion.perfil.negocio)
const archivo = ref(null)
const subiendo = ref(false)

// Recorta al centro y convierte a JPG. Dibujar en un canvas elimina los metadatos (EXIF) de la foto original.
function recortar (f, lado = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = lado
      const m = Math.min(img.naturalWidth, img.naturalHeight)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, lado, lado)
      ctx.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, lado, lado)
      URL.revokeObjectURL(img.src)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.9)
    }
    img.onerror = () => reject(new Error('El archivo no es una imagen válida'))
    img.src = URL.createObjectURL(f)
  })
}
async function subir (e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return
  if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return avisos.avisar('Elige una imagen JPG, PNG o WebP.')
  if (f.size > 8 * 1024 * 1024) return avisos.avisar('La imagen pesa más de 8 MB. Elige una más ligera.')
  subiendo.value = true
  try { await sesion.subirFoto(await recortar(f)); avisos.avisar('Foto de perfil actualizada', 'ok') } catch (err) {
    const m = (err && err.message) || 'revisa tu conexión'
    avisos.avisar('No se pudo subir la foto: ' + m + (/bucket|not found|policy|security/i.test(m) ? '. Ejecuta de nuevo supabase/schema.sql.' : ''))
  }
  subiendo.value = false
}
async function quitar () { try { await sesion.quitarFoto(); avisos.avisar('Foto eliminada', 'ok') } catch (e) { avisos.avisar('No se pudo quitar la foto: ' + e.message) } }
async function guardar () {
  try { await sesion.actualizarMeta({ negocio: negocio.value.trim().slice(0, 60) }); avisos.avisar('Perfil guardado', 'ok') } catch (e) { avisos.avisar('No se pudo guardar el perfil: ' + e.message) }
}
const salir = async () => { emit('cerrar'); await sesion.salir('Desde el perfil') }
</script>

<template>
  <Ventana titulo="Mi perfil" :subtitulo="sesion.esDemo ? 'Demostración' : sesion.perfil.email" icono="user" ancho="sm" @cerrar="emit('cerrar')">
    <div class="perfil-foto">
      <Avatar grande />
      <div class="botones">
        <button type="button" class="sec sm" :disabled="subiendo" @click="archivo.click()"><Icono n="camera" sm />{{ subiendo ? 'Subiendo…' : sesion.perfil.avatar ? 'Cambiar foto' : 'Subir foto' }}</button>
        <button v-if="sesion.perfil.avatar" type="button" class="peligro sm" @click="quitar">Quitar</button>
      </div>
      <input ref="archivo" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="subir">
    </div>
    <form @submit.prevent="guardar">
      <label>Nombre de tu negocio<input v-model="negocio" maxlength="60" placeholder="Ej. Abarrotes Don Pepe"></label>
      <button type="submit" class="ancho">Guardar</button>
    </form>
    <div class="lista-opciones">
      <button type="button" class="opcion" @click="ui.abrir('seguridad')"><Icono n="shield" /><span><b>Seguridad</b><small>Llaves de acceso, actividad y dispositivos</small></span><Icono n="arrow" sm /></button>
      <button v-if="!sesion.esDemo" type="button" class="opcion" @click="ui.abrir('contrasena')"><Icono n="lock" /><span><b>Cambiar contraseña</b><small>Mínimo 8 caracteres con letras y números</small></span><Icono n="arrow" sm /></button>
      <button type="button" class="opcion" @click="ui.abrir('soporte')"><Icono n="chat" /><span><b>Ayuda y soporte</b><small>Escríbenos por WhatsApp, correo y más</small></span><Icono n="arrow" sm /></button>
      <button type="button" class="opcion" @click="ui.abrir('configuracion')"><Icono n="gear" /><span><b>Configuración</b><small>Tema, colores, avisos y notificaciones</small></span><Icono n="arrow" sm /></button>
      <router-link class="opcion" to="/privacidad" @click="emit('cerrar')"><Icono n="doc" /><span><b>Aviso de Privacidad y Términos</b><small>Qué datos guardamos y tus derechos</small></span><Icono n="arrow" sm /></router-link>
    </div>
    <button type="button" class="sec ancho" @click="salir"><Icono n="logout" sm />Cerrar sesión</button>
  </Ventana>
</template>
