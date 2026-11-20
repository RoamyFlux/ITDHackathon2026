/* =====================================================================
 * PUNTO DE ENTRADA
 * Crea la app de Vue, conecta Pinia (los "stores": datos compartidos) y el router (las páginas),
 * carga las fuentes y estilos, y arranca la revisión de sesión.
 * ===================================================================== */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router.js'
import { useSesion } from './stores/sesion.js'

// Tipografías incluidas en la app (no se descargan de Google: más privacidad y funcionan sin internet).
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/plus-jakarta-sans'
import './styles/temas.css'
import './styles/base.css'
import './styles/panel.css'
import './styles/ventanas.css'
import './styles/inicio.css'

const app = createApp(App)
app.use(createPinia())
useSesion().iniciar()
app.use(router)
app.mount('#app')
