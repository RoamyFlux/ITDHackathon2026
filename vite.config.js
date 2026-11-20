/* =====================================================================
 * CONFIGURACIÓN DE VITE (la herramienta que arma la página)
 *   npm run dev     -> servidor local con recarga instantánea (http://localhost:5173)
 *   npm run build   -> versión final optimizada en la carpeta dist/ (la que se publica en GitHub Pages)
 *   npm run preview -> sirve dist/ para probar la versión final
 * ===================================================================== */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const supa = JSON.parse(readFileSync(new URL('./config/supabase.json', import.meta.url)))
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || supa.url
const SUPABASE_HOST = new URL(SUPABASE_URL).host

/* ---- POLÍTICA DE SEGURIDAD DE CONTENIDO (CSP) ----
 * Le dice al navegador de dónde SÍ puede cargar cosas la página. Todo lo demás se bloquea, así que aunque
 * alguien lograra meter código en un dato (por ejemplo, en el nombre de un producto), no se ejecutaría.
 *   default-src 'self'      -> por defecto, solo archivos de esta misma página
 *   script-src 'self'       -> solo scripts propios: nada en línea, nada de otros sitios, nada de eval
 *   style-src 'self'        -> solo hojas de estilo propias
 *   connect-src             -> solo puede hablar con esta página y con TU proyecto de Supabase
 *   img-src                 -> imágenes propias, fotos de perfil de Supabase y las generadas en el navegador
 *   worker-src 'self'       -> el lector de Excel (Web Worker) y la app instalable (service worker)
 *   object-src 'none'       -> sin plugins (Flash, etc.)
 *   base-uri / form-action  -> nadie puede redirigir enlaces ni formularios a otro sitio
 * Se agrega solo al compilar: en "npm run dev" Vite necesita inyectar estilos y scripts en línea. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  // cloudflare-dns.com: revisar que el dominio de un correo nuevo reciba correo (ver src/lib/correo.js)
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://cloudflare-dns.com`,
  `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests'
].join('; ')

const politicaSeguridad = {
  name: 'politica-seguridad',
  apply: 'build',
  transformIndexHtml: html => html.replace(/<!-- %CSP%.*?-->/, `<meta http-equiv="Content-Security-Policy" content="${CSP}">`)
}

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages publica en https://<usuario>.github.io/ITDHackaton2026/ (BASE_PATH se puede cambiar al compilar).
  base: command === 'build' || isPreview ? (process.env.BASE_PATH || '/ITDHackaton2026/') : '/',
  plugins: [
    vue(),
    politicaSeguridad,
    /* APP INSTALABLE (PWA): genera el manifest y un service worker que guarda la app para abrir rápido.
     * Los DATOS siempre vienen de Supabase (no se guardan copias de tu inventario en caché). */
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // archivo registerSW.js aparte (compatible con la CSP, sin scripts en línea)
      includeAssets: ['logo.svg', 'apple-touch-icon.png', 'prefs.js'],
      manifest: {
        name: 'EarlyStock · Inventario inteligente',
        short_name: 'EarlyStock',
        description: 'Avisa antes de que se acabe o caduque un producto, sugiere ofertas y arma tu lista de compras.',
        lang: 'es-MX',
        display: 'standalone',
        background_color: '#0f0a1a',
        theme_color: '#1b0d33',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'logo.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ],
  // assetsInlineLimit 0: ninguna fuente o imagen se incrusta como "data:" (la CSP solo permite fuentes propias).
  build: { target: 'es2022', sourcemap: false, assetsInlineLimit: 0 },
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.js'] }
}))
