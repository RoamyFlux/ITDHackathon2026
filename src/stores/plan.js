/* =====================================================================
 * PLAN DE LA CUENTA
 * Qué plan tiene la cuenta (Gratis, Pro o Max), hasta cuándo, y cuánto lleva usado.
 * El plan lo guarda la base de datos (tabla suscripciones; ver schema.sql §16) y solo el administrador lo
 * cambia. Aquí solo se LEE (función mi_plan) para mostrarlo y avisar antes de llegar al límite.
 * En la demostración se usa el plan Gratis.
 * ===================================================================== */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { sb } from '../lib/supabase.js'
import { useSesion } from './sesion.js'
import { planPorId, cabenProductos, cabenOfertas } from '../logica/planes.js'

export const usePlan = defineStore('plan', () => {
  const sesion = useSesion()
  const planId = ref('gratis')
  const contratado = ref('gratis') // el que pagó (si ya venció, planId vuelve a gratis)
  const vence = ref(null)
  const esAdmin = ref(false) // para la coronita (también lo sabe el store de soporte)
  const error = ref('')

  const plan = computed(() => planPorId(planId.value))
  const vencido = computed(() => contratado.value !== 'gratis' && planId.value === 'gratis')

  async function cargar () {
    error.value = ''
    if (!sb || sesion.modo !== 'dentro') { planId.value = 'gratis'; contratado.value = 'gratis'; vence.value = null; esAdmin.value = false; return }
    const r = await sb.rpc('mi_plan')
    if (r.error) {
      // Si la base aún no tiene los planes (falta ejecutar schema.sql), se trata como Gratis sin bloquear la app.
      planId.value = 'gratis'
      error.value = /function|schema cache|does not exist/i.test(r.error.message) ? 'Falta actualizar la base de datos (schema.sql) para los planes.' : ''
      return
    }
    planId.value = planPorId(r.data.plan).id
    contratado.value = planPorId(r.data.plan_contratado).id
    vence.value = r.data.vence || null
    esAdmin.value = r.data.es_admin === true
  }
  watch(() => sesion.usuario && sesion.usuario.id, () => { cargar() }, { immediate: true })

  // Revisiones antes de agregar (el límite real lo aplica la base de datos).
  const puedeAgregar = (usados, nuevos = 1) => cabenProductos(planId.value, usados, nuevos)
  const puedeOfertar = activas => cabenOfertas(planId.value, activas)

  return { planId, contratado, vence, esAdmin, error, plan, vencido, cargar, puedeAgregar, puedeOfertar }
})
