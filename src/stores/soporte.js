/* =====================================================================
 * SOPORTE Y ADMINISTRACIÓN
 * contactos = medios para que los usuarios hablen con soporte (WhatsApp, Telegram, correo…), ordenados.
 * esAdmin   = la cuenta actual es administradora (lo decide la base con es_admin(); ver schema.sql §14).
 * Solo el administrador puede agregar, editar, ocultar, ordenar y borrar contactos: además de que la app
 * esconde los botones, la base de datos rechaza los cambios de cualquier otra cuenta (RLS).
 * ===================================================================== */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { sb } from '../lib/supabase.js'
import { useSesion } from './sesion.js'
import { validarContacto } from '../logica/soporte.js'

export const useSoporte = defineStore('soporte', () => {
  const sesion = useSesion()
  const contactos = ref([])
  const cargado = ref(false)
  const error = ref('')
  const esAdmin = ref(false)

  async function cargar () {
    if (!sb) { cargado.value = true; return }
    error.value = ''
    const r = await sb.from('contactos_soporte').select('id,red,etiqueta,valor,orden,activo').order('orden').order('updated_at')
    if (r.error) error.value = /does not exist|schema cache/i.test(r.error.message) ? 'Falta actualizar la base de datos (ejecutar supabase/schema.sql).' : 'No se pudieron cargar los contactos.'
    else contactos.value = r.data
    cargado.value = true
  }
  async function revisarAdmin () {
    esAdmin.value = false
    if (!sb || sesion.modo !== 'dentro') return false
    const r = await sb.rpc('es_admin')
    esAdmin.value = !r.error && r.data === true
    return esAdmin.value
  }
  // Al entrar o salir se vuelve a revisar si es administrador.
  watch(() => sesion.usuario && sesion.usuario.id, () => { revisarAdmin() }, { immediate: true })

  const chk = r => { if (r.error) throw new Error(/row-level|permission/i.test(r.error.message) ? 'Solo el administrador puede hacer esto.' : r.error.message); return r.data }
  function validar (c) { const e = validarContacto(c.red, c.valor); if (e) throw new Error(e) }

  async function guardar (c) {
    validar(c)
    const fila = { red: c.red, valor: String(c.valor).trim(), etiqueta: String(c.etiqueta || '').trim().slice(0, 60), activo: c.activo !== false, updated_at: new Date().toISOString() }
    if (c.id) chk(await sb.from('contactos_soporte').update(fila).eq('id', c.id))
    else chk(await sb.from('contactos_soporte').insert({ ...fila, orden: contactos.value.length ? Math.max(...contactos.value.map(x => x.orden)) + 1 : 0 }))
    sesion.registrarEvento('contactos_editados', `${c.id ? 'Editó' : 'Agregó'} contacto de ${c.red}`)
    await cargar()
  }
  async function borrar (c) {
    chk(await sb.from('contactos_soporte').delete().eq('id', c.id))
    sesion.registrarEvento('contactos_editados', `Borró contacto de ${c.red}`)
    await cargar()
  }
  async function alternar (c) {
    chk(await sb.from('contactos_soporte').update({ activo: !c.activo, updated_at: new Date().toISOString() }).eq('id', c.id))
    await cargar()
  }
  // Sube o baja un contacto en la lista (intercambia su "orden" con el de al lado).
  async function mover (c, dir) {
    const lista = [...contactos.value]
    const i = lista.findIndex(x => x.id === c.id)
    const j = i + dir
    if (j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    for (let k = 0; k < lista.length; k++) if (lista[k].orden !== k) chk(await sb.from('contactos_soporte').update({ orden: k }).eq('id', lista[k].id))
    await cargar()
  }

  return { contactos, cargado, error, esAdmin, cargar, revisarAdmin, guardar, borrar, alternar, mover }
})
