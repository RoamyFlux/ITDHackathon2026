# Presentación de EarlyStock (Hackathon ITD 2026)

`EarlyStock_Presentacion.pptx`: 28 diapositivas en 16:9, con los colores y el logo de la app. Cada una lleva **notas para quien presenta**, **transiciones suaves** y **animaciones de entrada** automáticas, sin necesidad de dar clic.

| Sección | Diapositivas |
| --- | --- |
| Inicio | Portada y agenda |
| Problema y solución | Desabasto, merma y control a mano; qué es EarlyStock; **video publicitario incrustado** (clic para reproducir) |
| La app en acción | Capturas reales: Hoy, Inventario, Ofertas y compras, Reportes y Ctrl + K, celular y temas |
| El código | Arquitectura, semáforo, caducidad por lote (FEFO), motor de sugerencias, cola de guardado, RLS y límites de plan, CSP y correos reales; luego seguridad y calidad |
| El negocio | Planes Gratis / Pro / Max, comparación con libreta y Excel, mercado y próximos pasos |
| Cierre | QR a https://roamyflux.github.io/ITDHackaton2026/ |

**Para presentar:** ábranla en PowerPoint en modo "Presentación con moderador" para ver las notas. Los elementos entran solos en menos de 1.5 s; el video se reproduce con un clic.

**Animaciones:**
- **Transiciones:** desvanecido de 0.7 s entre diapositivas de contenido, y "empujar hacia arriba" en la portada, las portadas de sección y el cierre.
- **Entradas:** cada elemento aparece flotando hacia arriba, en orden de lectura (título, imagen o código, y luego tarjetas y puntos uno tras otro).
- **Efectos especiales:**
  - Los números grandes y el QR aparecen con un zoom suave.
  - Las flechas del camino de cada cambio se dibujan de izquierda a derecha.

## Volver a generarla
El código está en `fuente/` (comentado en español). Necesita Node 20+, Python 3 con `Pillow` y `lxml`, y `ffmpeg`.

```bash
# En la raíz del proyecto: compila la app de prueba (dist-e2e/) y corre los recorridos en navegador
npm install && npx playwright install chromium && npm run e2e

# En presentacion/fuente/
npm install
npm run todo
```

`npm run todo` hace cinco pasos, que también se pueden correr uno por uno:

| Paso | Script | Qué hace |
| --- | --- | --- |
| 1 | `recursos.cjs` | Logo y fondos con los colores de la app |
| 2 | `capturas.cjs` | Capturas de la app real con la tienda de ejemplo y un Supabase simulado: no toca datos reales |
| 3 | `preparar.py` | Recorta y enmarca las capturas (ventana de navegador y teléfono), toma el video y saca su portada |
| 4 | `generar.cjs` | Arma las diapositivas con pptxgenjs: textos, código resaltado, notas y texto alternativo |
| 5 | `postproceso.py` | Tema de PowerPoint, limpieza del texto alternativo, transiciones y animaciones; escribe `../EarlyStock_Presentacion.pptx` |

**Medios:**
- **Video:** se toma de `fuente/medios/anuncio.mp4` si existe. Si no, se saca de la presentación actual, para no subirlo dos veces al repositorio.
- **QR:** está en `fuente/medios/qr.jpg`.
- **Archivos intermedios:** quedan en `fuente/trabajo/`, que no se sube.
