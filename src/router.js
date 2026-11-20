/* =====================================================================
 * PÁGINAS (router)
 *   #/            -> página de inicio (presentación, entrar y crear cuenta)
 *   #/app         -> el panel del inventario (requiere sesión o modo demostración)
 *   #/privacidad  -> Aviso de Privacidad        #/terminos -> Términos de Uso
 * Se usa el modo "hash" (#/…) porque GitHub Pages solo sirve archivos: así cualquier enlace funciona.
 * ===================================================================== */
import { createRouter, createWebHashHistory } from 'vue-router'
import { useSesion } from './stores/sesion.js'
import Inicio from './views/Inicio.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'inicio', component: Inicio, meta: { titulo: 'Inventario inteligente para tu negocio' } },
    { path: '/app', name: 'app', component: () => import('./views/Panel.vue'), meta: { requiereSesion: true, titulo: 'Mi inventario' } },
    { path: '/privacidad', name: 'privacidad', component: () => import('./views/Privacidad.vue'), meta: { titulo: 'Aviso de Privacidad' } },
    { path: '/terminos', name: 'terminos', component: () => import('./views/Terminos.vue'), meta: { titulo: 'Términos de Uso' } },
    { path: '/:resto(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

// Guardia: el panel solo con sesión; la página de inicio manda al panel si ya hay sesión.
router.beforeEach(async to => {
  const sesion = useSesion()
  await sesion.listoPromesa
  if (to.meta.requiereSesion && !sesion.dentro) return { name: 'inicio' }
  if (to.name === 'inicio' && sesion.dentro && !to.query.ver) return { name: 'app' }
})
router.afterEach(to => { document.title = `EarlyStock · ${to.meta.titulo || ''}` })
