# Branch changes

## 2026-07-14 — Construcción inicial completa de Zephyriov

- Scaffold con la plantilla oficial next+supabase (pnpm), tema vintage blanco + rojo vino, tipografía serif para títulos.
- `supabase/schema.sql`: schema completo (catálogo + datos de usuario con RLS, triggers de profiles/updated_at), listo para pegar.
- `supabase/seed.sql`: catálogo curado de 14 aperturas × 4 líneas × ~10 movimientos con explicaciones en inglés; generado y **validado jugada por jugada con chess.js** (`scripts/generate-seed.mjs`). Incluye Ponziani, Modern, Sicilian Dragon, Caro-Kann Fantasy y French Two Knights.
- Motor SRS puro en `lib/srs/` (grading por bloque, scheduler estilo Anki con ease 2.5, session builder round-robin) con 25 tests en Vitest — todos pasan.
- Integración Lichess + Chess.com (últimas ~300 partidas, blitz/rapid/classical) y matcher de aperturas por claves normalizadas.
- Onboarding: análisis de partidas → top 3 blancas + top 3 negras → selección de color por apertura → creación de tarjetas SRS.
- Sesión de estudio: tablero react-chessboard, auto-respuesta del rival, timer por jugada (umbral 2 min), feedback bad/mid/good, explicación de cada jugada, reencolado de fallos en la misma sesión, calificación server-side.
- Home (streak + botón de sesión diaria + barras por apertura), Progress (detalle por línea) y Settings (líneas/sesión, movimientos/bloque, timezone, cambio de color con reset).
- PWA: manifest + iconos generados + service worker mínimo. Build de producción, lint y tests verificados en verde.

Pendiente para probar en vivo: pegar los dos SQL en Supabase, llenar `.env.local` y correr `pnpm dev`.

[Listo :v]

## 2026-07-16 — Click-to-move + rediseño vintage

- **Click-to-move en el tablero de estudio**: además de arrastrar, ahora se puede jugar con click en la pieza y click en la casilla destino (estilo lichess/chess.com, sin premoves). Selección con anillo dorado, puntos en destinos legales, anillo en capturas, toggle para deseleccionar; solo las piezas del estudiante son seleccionables/arrastrables. Drag y click comparten la misma lógica (`tryMove`).
- **Rediseño UI vintage** (cartel impreso / soda-fountain): paleta papel envejecido + rojo cartel + teal + tinta con grano de medios tonos; tipografías Alfa Slab One (títulos) y Oswald (etiquetas mayúsculas); bordes duros de tinta con sombra offset "letterpress" que se presiona al click; inputs píldora; header como franja roja; racha en sello dentado SVG; divisores con estrellas; badges de calificación como listones (ribbon); tablero crema/teal con marco tipo gabinete. Tokens y clases nuevas documentadas en README (sección "UI: diseño vintage").
- Verificado: typecheck, lint, build de producción y prueba funcional del click-to-move en el navegador.

[Listo :v]

## 2026-07-16 — Documentación completa en README

- README reescrito como documentación detallada del producto tras analizar toda la codebase: arquitectura en capas (cliente / servidor / Supabase), distribución de módulos comentada, entry points por tipo de evento, flujo de request paso a paso (Home, jugada en sesión de estudio, onboarding), sistema de llamadas (RSC + server actions, sin rutas API), auth en 3 capas (proxy, requireUser, RLS), modelo de datos tabla por tabla, motor SRS con sus tablas de calificación/scheduling, proveedores externos (Lichess/Chess.com + matcher), manejo de fechas (yyyy-mm-dd, timezone del perfil, cookie dev), tablero de estudio, design system vintage, catálogo con formato fuente y regeneración, tests, PWA, y una guía "¿dónde toco para…?" con enlaces directos a archivos.
- Sin cambios de código; solo documentación.

[Listo :v]
