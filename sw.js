/* =====================================================================
 * SERVICE WORKER DE EARLYSTOCK
 * Un "service worker" es un pequeño programa que el navegador ejecuta aparte de la página.
 * Aquí sirve para que EarlyStock se pueda INSTALAR como app y abra más rápido:
 *   - Guarda en caché SOLO los archivos propios de la app (página, logo, íconos, manifest).
 *   - Para la página (index.html) usa "red primero": si hay internet trae la versión nueva;
 *     si no hay, muestra la última guardada.
 *   - NUNCA toca las peticiones a Supabase, Google Fonts ni la CDN: esas siempre van directo a internet,
 *     así los datos del inventario siempre están al día.
 * Si cambias archivos de la app, sube el número de CACHE (v1 -> v2) para que se renueve la caché.
 * ===================================================================== */
const CACHE = 'earlystock-v3';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './assets/logo.svg',
                  './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png'];

// INSTALACIÓN: descarga y guarda los archivos de la app. skipWaiting activa la versión nueva enseguida.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

// ACTIVACIÓN: borra cachés de versiones anteriores y toma el control de las pestañas abiertas.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// PETICIONES: solo intercepta lecturas (GET) del mismo sitio. Todo lo demás pasa sin tocarse.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Página: red primero (y se actualiza la copia guardada); sin internet, la copia guardada.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req)
        .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Logo, íconos y manifest: caché primero (casi nunca cambian), y si no están, de la red.
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
