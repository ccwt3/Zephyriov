# Zephyriov — Chess Opening Trainer

WebApp/PWA mobile-first para aprender las aperturas de ajedrez **que realmente juegas**, con repetición espaciada estilo Anki. Analiza tus partidas de Lichess y Chess.com, detecta tus 3 aperturas más jugadas con blancas y 3 con negras, y te entrena sus líneas teóricas con un scheduler SRS.

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, plantilla oficial `with-supabase`) |
| Base de datos + Auth | Supabase (Postgres + RLS, email/password) |
| Ajedrez | `chess.js` (validación/SAN) + `react-chessboard` (tablero) |
| Tests | Vitest (motor SRS) |
| Deploy | Vercel |
| Gestor de paquetes | **pnpm** |

## Setup

1. **Supabase**: crea un proyecto y ejecuta en el SQL editor, en orden:
   - [supabase/schema.sql](supabase/schema.sql) — tablas, enums, RLS y triggers (una sola vez).
   - [supabase/seed.sql](supabase/seed.sql) — catálogo curado de aperturas (una sola vez; **regenerable**, ver abajo).
2. **Variables de entorno**: copia `.env.example` a `.env.local` y llena:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
3. **Correr**:
   ```
   pnpm install
   pnpm dev        # desarrollo
   pnpm test       # tests del motor SRS
   pnpm build      # build de producción
   ```
4. **Deploy en Vercel**: importa el repo, añade las dos variables de entorno y listo. El manifest + service worker hacen la app instalable como PWA.

## Arquitectura

```
app/
  page.tsx               Home: streak + botón de sesión diaria + barras de progreso
  onboarding/            Conectar usernames → análisis → confirmar 6 aperturas
  study/                 Sesión de estudio (tablero, timer, feedback, explicaciones)
  progress/              Detalle de progreso por apertura/línea
  settings/              Config de sesión, timezone y color por apertura
  auth/                  Login/sign-up (de la plantilla Supabase)
  manifest.ts            Manifest PWA
lib/
  srs/                   Motor SRS puro (sin I/O): grading, scheduler, session-builder + tests
  external/              Clientes Lichess / Chess.com + matcher de aperturas
  actions/               Server actions: onboarding, session, settings
  queries/               Lecturas agregadas para Home/Progress/Settings
  supabase/              Clientes SSR de la plantilla (client/server/proxy)
components/
  study/                 StudySession (tablero + quiz), MoveTimer, GradeBadge
  onboarding/, settings/ Flujos cliente
scripts/
  catalog/               Datos fuente del catálogo (1 archivo por apertura)
  generate-seed.mjs      Valida cada línea con chess.js y genera supabase/seed.sql
  generate-icons.mjs     Genera los iconos PWA con sharp
supabase/
  schema.sql, seed.sql   SQL listo para pegar en la consola
```

### Modelo de datos

- **Catálogo global** (solo lectura): `openings` → `opening_lines` (4 por apertura) → `line_moves` (cada media-jugada con su SAN y explicación en inglés).
  - `openings.playable_colors`: desde qué lados tiene sentido estudiarla (ej. la Fantasy se puede estudiar como blancas o negras).
  - `openings.detection_keys`: claves para hacer match con los tags de apertura de las APIs.
- **Por usuario** (RLS `user_id = auth.uid()`): `profiles`, `user_openings` (las 6 elegidas + color), `user_lines` (la "tarjeta" SRS), `study_sessions` → `session_items` → `move_attempts`, `user_streaks`.

### Motor SRS (`lib/srs/`)

Sigue la spec del proyecto; donde la spec calla, usa los defaults de Anki (SM-2 simplificado):

- **Calificación por bloque** (`grading.ts`): primer bloque → cualquier error = bad, lento (>2 min) = mid, limpio = good. Bloques acumulados → >1 error = bad, 1 error o lento = mid, limpio = good.
- **Scheduler** (`scheduler.ts`): nuevas → bad/mid repiten en la sesión, good gradúa a 1 día. En repaso → bad = lapse (vuelve a aprendizaje, reinicia en 1d al aprobar), mid = mañana sin crecer, good = 1d → 3d → ×2.5 sin tope.
- **Profundidad**: good limpio desbloquea el siguiente bloque de movimientos (4 → 8 → 10...); la unidad de repetición siempre es el bloque acumulado completo.
- **Sesión** (`session-builder.ts`): todos los repasos due + hasta N nuevas (default 6, round-robin entre aperturas). Nuevas primero, fallos se reencolan al final.
- **Streak**: ≥3 líneas nuevas revisadas en el día (o todas si quedan menos de 3; con el pool agotado, completar los repasos cuenta).

### UI: diseño vintage

Estética de cartel impreso años 20–50 (papel envejecido + rojo cartel + teal de fuente de sodas + tinta cálida), inspirada en UI kits retro y portadas constructivistas de ajedrez:

- **Tokens** en [app/globals.css](app/globals.css): además de los tokens shadcn, `--ink`, `--teal`, `--gold` y `--paper` (expuestos en Tailwind como `ink/teal/gold/paper`). El fondo lleva un grano de medios tonos sutil (radial-gradient). Hay variante `.dark` en papel chocolate.
- **Tipografía**: Alfa Slab One (`font-display`, títulos h1–h3 y marca), Oswald (`font-label`, botones/etiquetas en mayúsculas con tracking), Geist para cuerpo.
- **Clases utilitarias** (en `@layer components`): `card-vintage` (borde 2px tinta + sombra dura offset `shadow-press`), `label-vintage` (mayúsculas condensadas), `ribbon` (banner con puntas bifurcadas vía clip-path; sin borde/sombra porque clip-path los recorta).
- **Componentes**: botones con sombra dura que se "presiona" en `:active`; inputs píldora con foco dorado; header como franja roja de cartel; racha en sello dentado SVG ([components/streak-seal.tsx](components/streak-seal.tsx)); divisores con estrellas ([components/star-divider.tsx](components/star-divider.tsx)).
- **Tablero**: casillas crema/teal a juego con la paleta, marco tipo gabinete teal, y coordenadas coloreadas por casilla.

### Tablero: click-to-move

El tablero de estudio acepta **arrastrar y también click-click** (como lichess/chess.com, sin premoves): click en una pieza propia la selecciona (anillo dorado) y muestra sus destinos legales (punto en casillas vacías, anillo en capturas); click en un destino ejecuta la jugada, click en la misma pieza la deselecciona. Ambas vías comparten `tryMove()` en [components/study/study-session.tsx](components/study/study-session.tsx), así el registro de intentos y el flujo de jugada errónea es idéntico. `canDragPiece` limita el arrastre a las piezas del estudiante.

### Decisiones técnicas

- **Catálogo curado y validado**: el contenido se autora en `scripts/catalog/*.mjs` y `generate-seed.mjs` **valida cada secuencia SAN con chess.js** antes de emitir el SQL — imposible sembrar una línea ilegal. Para editar el catálogo: modificar los `.mjs`, correr `node scripts/generate-seed.mjs` y re-ejecutar el seed.
- **Calificación server-side**: el cliente reporta jugadas crudas (`move_attempts`); el grade y el update SRS se calculan en el server action (`lib/actions/session.ts`).
- **Transposiciones ignoradas**: se usa el tag de apertura que reporta cada API (spec §8).
- **Cambio de color**: cambiar el lado de estudio de una apertura resetea el SRS de sus líneas (las jugadas calificadas cambian por completo).
- **Fecha dev**: en desarrollo, la cookie `zephyriov-dev-date` (yyyy-mm-dd) simula "hoy" para probar el SRS entre días: `document.cookie = "zephyriov-dev-date=2026-07-15; path=/"`.
- **Multiusuario desde el día 1**: todo el modelo lleva `user_id` + RLS aunque hoy haya una sola cuenta (spec §13).

## Análisis de partidas

- **Lichess**: `GET /api/games/user/{u}?max=300&opening=true&perfType=blitz,rapid,classical` (ndjson, sin token).
- **Chess.com**: archivos mensuales públicos (últimos ~3 meses, máx 300 partidas, blitz/rapid/daily), apertura extraída del header `ECOUrl` del PGN.
- El matcher normaliza nombres (minúsculas, sin símbolos) y elige la apertura del catálogo cuya clave coincidente sea **más larga** (la más específica gana: "Fantasy Variation" > "Caro-Kann").

## Catálogo actual

14 aperturas × 4 líneas × ~10 movimientos del estudiante (1,120 medias-jugadas con explicación): Ponziani, Caro-Kann Fantasy, French Two Knights, Italian, Ruy Lopez, Vienna, London, Queen's Gambit, Sicilian Dragon, Modern, Caro-Kann, French, Scandinavian, King's Indian.
