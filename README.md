# Zephyriov — Chess Opening Trainer

WebApp/PWA mobile-first para aprender las aperturas de ajedrez **que realmente juegas**, con repetición espaciada estilo Anki. Analiza tus partidas de Lichess y Chess.com, detecta tus 3 aperturas más jugadas con blancas y 3 con negras, y te entrena sus líneas teóricas con un scheduler SRS que califica cada bloque de jugadas y programa el próximo repaso.

---

## Índice

1. [Tecnologías](#tecnologías)
2. [Setup](#setup)
3. [Arquitectura](#arquitectura)
4. [Distribución de módulos](#distribución-de-módulos)
5. [Entry points](#entry-points)
6. [Flujo de una request](#flujo-de-una-request)
7. [Sistema de llamadas (cliente ↔ servidor)](#sistema-de-llamadas-cliente--servidor)
8. [Autenticación y seguridad](#autenticación-y-seguridad)
9. [Modelo de datos](#modelo-de-datos)
10. [Motor SRS](#motor-srs)
11. [Proveedores externos](#proveedores-externos)
12. [Manejo de fechas](#manejo-de-fechas)
13. [El tablero de estudio](#el-tablero-de-estudio)
14. [UI: diseño vintage](#ui-diseño-vintage)
15. [Catálogo de aperturas](#catálogo-de-aperturas)
16. [Librería de aperturas](#librería-de-aperturas)
17. [Tests](#tests)
18. [PWA](#pwa)
19. [Licencia y atribuciones](#licencia-y-atribuciones)
20. [Guía rápida: ¿dónde toco para…?](#guía-rápida-dónde-toco-para)

---

## Tecnologías

| Pieza | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | `cacheComponents: true` → las páginas usan Partial Prerendering (shell estático + contenido dinámico en streaming bajo `<Suspense>`) |
| UI | React 19 + Tailwind CSS 3 + shadcn/ui (Radix) | Componentes base en `components/ui/` |
| Base de datos + Auth | Supabase (Postgres + RLS, email/password) | Cliente SSR vía `@supabase/ssr`, sesión en cookies |
| Ajedrez | `chess.js` (validación, SAN, legalidad) + `react-chessboard` v5 (tablero) | |
| Tipografías | Alfa Slab One, Oswald, Geist (`next/font`) | |
| Tests | Vitest | Cubren el motor SRS puro |
| Deploy | Vercel | |
| Gestor de paquetes | **pnpm** | |

## Setup

1. **Supabase**: crea un proyecto y ejecuta en el SQL editor, en orden:
   - [supabase/schema.sql](supabase/schema.sql) — enums, tablas, RLS y triggers (una sola vez).
   - [supabase/seed.sql](supabase/seed.sql) — catálogo curado de aperturas (una sola vez; **regenerable**, ver [Catálogo](#catálogo-de-aperturas)).
   - Si tu base **ya existía** antes de un cambio de schema, ejecuta los ALTERs de [supabase/migrations/](supabase/migrations/) que le falten (cada archivo indica qué agrega).
2. **Variables de entorno**: copia `.env.example` a `.env.local` y llena:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   APP_CONTACT=tu@correo.com          # opcional pero recomendado
   ```
   Las dos primeras son obligatorias (cliente y servidor); si faltan, el proxy deja pasar todo sin auth (modo tutorial de la plantilla, ver `hasEnvVars` en [lib/utils.ts](lib/utils.ts)).

   `APP_CONTACT` (solo servidor) viaja en el `User-Agent` hacia Lichess y Chess.com: es lo que Chess.com usa para contactarte antes de bloquear la app si detecta algo raro. Sin ella las peticiones siguen funcionando, solo van sin contacto. Si despliegas en Vercel, añádela también ahí.
3. **Correr**:
   ```
   pnpm install
   pnpm dev        # desarrollo (localhost:3000)
   pnpm test       # tests del motor SRS
   pnpm lint       # eslint
   pnpm build      # build de producción
   ```
4. **Deploy en Vercel**: importa el repo, añade las dos variables de entorno y listo. El manifest + service worker hacen la app instalable como PWA.
5. **Simular días** (solo desarrollo): la cookie `zephyriov-dev-date` (yyyy-mm-dd) reemplaza "hoy" para probar el SRS entre días sin esperar:
   ```js
   document.cookie = "zephyriov-dev-date=2026-07-17; path=/"
   ```

## Arquitectura

Tres capas con una regla central: **la lógica de dominio (SRS) es pura y no hace I/O**; el acceso a datos vive en server actions y queries del servidor; el cliente solo maneja interacción del tablero y formularios.

```
┌────────────────────────────────────────────────────────────┐
│  CLIENTE (componentes "use client")                        │
│  Tablero, timer, formularios, onboarding                   │
│  components/study/, components/onboarding/, settings/      │
└──────────────┬─────────────────────────────────────────────┘
               │ invoca server actions (RPC) / recibe props de RSC
┌──────────────▼─────────────────────────────────────────────┐
│  SERVIDOR (Next App Router)                                │
│  · proxy.ts → refresca sesión y protege rutas              │
│  · app/*/page.tsx (RSC) → leen con lib/queries/            │
│  · lib/actions/ ("use server") → escrituras y mutaciones   │
│      usa ↓ para las decisiones de dominio                  │
│  · lib/srs/ → motor puro (grading, scheduler, sesión)      │
│  · lib/external/ → APIs de Lichess / Chess.com             │
└──────────────┬─────────────────────────────────────────────┘
               │ @supabase/ssr (cookies) + PostgREST
┌──────────────▼─────────────────────────────────────────────┐
│  SUPABASE (Postgres)                                       │
│  Catálogo global (solo lectura) + datos por usuario (RLS)  │
└────────────────────────────────────────────────────────────┘
```

Decisiones clave:

- **Calificación server-side**: el cliente reporta jugadas crudas (`move_attempts`); el grade y el update SRS se calculan en el servidor (`lib/actions/session.ts`). El cliente nunca decide su propia nota.
- **Motor SRS puro**: `lib/srs/` no importa Supabase ni Next — recibe datos y devuelve decisiones. Por eso es 100% testeable con Vitest.
- **Catálogo curado y validado**: el contenido se autora en `scripts/catalog/*.mjs` y el generador valida cada SAN con chess.js antes de emitir SQL — imposible sembrar una línea ilegal.
- **Multiusuario desde el día 1**: todo el modelo lleva `user_id` + RLS aunque hoy haya una sola cuenta.
- **Transposiciones ignoradas**: se usa el tag de apertura que reporta cada API, no detección por FEN.

## Distribución de módulos

```
proxy.ts                 Middleware (Next 16 lo llama "proxy"): corre en CADA request
app/
  layout.tsx             Root layout: fuentes, ThemeProvider, registro del SW
  page.tsx               Home: streak + botón de sesión diaria + progreso
  study/page.tsx         Sesión de estudio (crea/reanuda la sesión del día)
  progress/page.tsx      Detalle de progreso por apertura/línea
  library/page.tsx       Librería: todo el catálogo, agregar/quitar del estudio
  settings/page.tsx      Config de sesión, time controls, timezone y color
  onboarding/page.tsx    Analizar partidas o armar repertorio a mano → confirmar
  auth/                  Login/sign-up/recuperación (plantilla Supabase)
    confirm/route.ts     Route handler: canjea el token OTP del reset de contraseña
  manifest.ts            Manifest PWA (generado por Next)
  globals.css            Tokens del design system + clases vintage
lib/
  srs/                   ★ Motor SRS puro (sin I/O) + tests
    grading.ts             Califica un bloque de jugadas → bad/mid/good
    scheduler.ts           Aplica la nota a la tarjeta → próximo due date
    session-builder.ts     Arma la sesión diaria (due + nuevas round-robin)
    types.ts               Grade, LineState, CardState, MoveResult
  actions/               Server actions ("use server") — todas las escrituras
    auth-helpers.ts        requireUser(): client + userId + profile
    session.ts             Crear sesión del día, calificar bloques, streak
    onboarding.ts          Analizar partidas, confirmar aperturas, cambiar color
    library.ts             addOpening / removeOpening (librería)
    settings.ts            Guardar preferencias
  queries/
    dashboard.ts           getDashboardData(): lectura agregada para Home/Progress/Settings
    library.ts             getLibraryData(): catálogo completo + estado "en estudio"
  notation.ts            formatLineNotation(): plies → "1.e4 e5 2.Nf3" (+ test)
  external/              Clientes de APIs públicas (sin tokens)
    lichess.ts             ndjson de partidas recientes
    chesscom.ts            Archivos mensuales públicos
    opening-matcher.ts     Match de tags contra el catálogo (clave más larga gana)
    user-agent.ts          User-Agent con contacto (APP_CONTACT) para ambas APIs
  supabase/              Clientes SSR de la plantilla
    client.ts              createBrowserClient (componentes cliente)
    server.ts              createServerClient con cookies (RSC/actions)
    proxy.ts               updateSession(): refresh de sesión + redirect a login
  dates.ts               getToday(timezone) + cookie dev de fecha
  db/types.ts            Tipos TS espejo de las tablas
  study-types.ts         Contratos cliente↔servidor de la sesión de estudio
components/
  study/                 StudySession (tablero + quiz), MoveTimer, GradeBadge
  onboarding/, settings/ Flujos cliente (incluye OpeningPicker del modo manual)
  library/               LibraryList: cards del catálogo con add/remove
  time-control-picker.tsx Chips de time controls (onboarding y settings)
  ui/                    Base shadcn restilizada (button, card, input, label…)
  app-header.tsx         Franja de navegación
  streak-seal.tsx        Sello dentado SVG de la racha
  star-divider.tsx       Divisor de sección con estrellas
  progress-bar.tsx       Barra de progreso con borde de tinta
  page-fallback.tsx      Fallback compartido de Suspense
scripts/
  catalog/               Datos fuente del catálogo (1 archivo por apertura)
  generate-seed.mjs      Valida cada línea con chess.js y genera supabase/seed.sql
  generate-icons.mjs     Genera los iconos PWA con sharp
supabase/
  schema.sql, seed.sql   SQL listo para pegar en la consola de Supabase
  migrations/            ALTERs incrementales para bases que ya existían
```

## Entry points

Por dónde "entra" la ejecución según el tipo de evento:

| Evento | Entry point | Qué pasa |
|---|---|---|
| **Cualquier request HTTP** | [proxy.ts](proxy.ts) → [lib/supabase/proxy.ts](lib/supabase/proxy.ts) | Refresca la sesión de Supabase en cookies y redirige a `/auth/login` si no hay usuario (excepto `/auth/*`, manifest y sw) |
| **Carga de página** | `app/<ruta>/page.tsx` | RSC con `<Suspense fallback={<PageFallback/>}>`; la parte async lee datos y renderiza |
| **Primer render de la app** | [app/layout.tsx](app/layout.tsx) | Fuentes, tema, `<SwRegister/>` (service worker) |
| **Mutación desde el cliente** | funciones de `lib/actions/*.ts` | Server actions invocadas como funciones async desde componentes cliente |
| **Link de reset de contraseña** | [app/auth/confirm/route.ts](app/auth/confirm/route.ts) | Route handler GET que canjea el token OTP (`verifyOtp`) y sigue a `next` |
| **Instalación PWA** | [app/manifest.ts](app/manifest.ts) + [public/sw.js](public/sw.js) | Manifest generado por Next; SW mínimo para installability |

Las páginas protegidas siguen todas el mismo patrón:

```tsx
export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Content />            {/* async: hace las queries */}
    </Suspense>
  );
}
```

El shell se prerenderiza estático (PPR) y el contenido con datos llega por streaming. Si `getDashboardData()`/`requireUser()` lanza (sin sesión), el componente hace `redirect("/auth/login")`.

## Flujo de una request

### A) Carga del Home (`GET /`)

```
Browser ── GET / ──▶ proxy.ts
                      │ updateSession(): lee cookies, getClaims()
                      │ sin usuario → 307 /auth/login  ✋
                      ▼ con usuario
                    app/page.tsx (RSC)
                      │ shell estático inmediato + Suspense
                      ▼
                    HomeContent (async)
                      │ getDashboardData()  ← lib/queries/dashboard.ts
                      │   requireUser() → profile
                      │   getToday(profile.timezone)
                      │   4 queries paralelas: streak, sesión de hoy,
                      │   user_openings, user_lines (+ line_moves p/ totales)
                      ▼
                    HTML en streaming con streak, estado del día y progreso
```

### B) Una jugada en la sesión de estudio (el flujo central)

```
1. /study (RSC) llama getOrCreateTodaySession()          [lib/actions/session.ts]
   · Si no existe study_session para hoy → buildSession() [lib/srs/session-builder.ts]
     arma los items (repasos due + N nuevas round-robin) y los inserta.
   · Devuelve pendingItems como StudyItem[] (jugadas + explicaciones ya incluidas).

2. <StudySession> (cliente) muestra la línea:             [components/study/study-session.tsx]
   · El rival "juega solo" sus plies (delay 600ms, chess.js local).
   · El estudiante mueve por drag o click-click → tryMove():
       - jugada ilegal → rebota, sin penalización
       - correcta → avanza; incorrecta → se muestra 900ms y se revela la teoría
   · Cada intento se acumula localmente: {ply, expectedSan, playedSan, correct, elapsedMs}

3. Bloque terminado → el cliente invoca submitLineResult(sessionItemId, results)
   (server action = POST automático de Next)

4. En el servidor:                                        [lib/actions/session.ts]
   a. requireUser() + getToday(timezone)
   b. gradeBlock(results, isFirstBlock)   → bad/mid/good  [lib/srs/grading.ts]
   c. inserta move_attempts (auditoría) y marca el session_item
   d. applyGrade(card, grade, today)      → nueva CardState [lib/srs/scheduler.ts]
   e. update de user_lines (state, interval, due_date, unlocked_moves…)
   f. ¿repeatInSession? → inserta un nuevo session_item (attempt_number+1)
      y lo devuelve para que el cliente lo encole al final
   g. maybeCompleteSession() + updateStreak()
   h. revalidatePath("/") → el Home refleja el progreso

5. El cliente muestra el GradeBadge y "Continue" pasa a la siguiente línea.
```

### C) Onboarding

Dos modos que alimentan la misma lista de selecciones (se pueden mezclar):

```
OnboardingFlow (cliente) — tab "Analyze my games"
  → analyzeOpenings(lichess, chesscom, timeControls)  [lib/actions/onboarding.ts]
      persiste usernames + analysis_time_controls en profiles
      Promise.allSettled(fetchLichessGames, fetchChesscomGames)
      → suggestOpenings(games, catálogo)    [lib/external/opening-matcher.ts]
      (no persiste selección; una fuente caída no rompe la otra)

OnboardingFlow (cliente) — tab "Build my own"
  → OpeningPicker: checkboxes sobre el catálogo completo (getLibraryData)
      agrega selecciones con gamesCount 0, color = principal de la apertura

  → usuario ajusta colores → confirmOpenings(selections)
      desactiva selección previa, upsert user_openings,
      crea user_lines faltantes (las que sobreviven conservan progreso),
      marca profiles.onboarded_at → redirect("/") server-side
```

## Sistema de llamadas (cliente ↔ servidor)

No hay rutas API manuales (`app/api/*` no existe). Toda la comunicación usa dos mecanismos de Next:

1. **Lecturas** — React Server Components llaman directamente a `lib/queries/` (o a `getOrCreateTodaySession`) durante el render. Los datos llegan al cliente como props serializadas.
2. **Escrituras** — Server actions (`"use server"` en `lib/actions/`). Los componentes cliente las importan y las invocan como funciones async; Next las convierte en un POST bajo el capó:

```tsx
// cliente
import { submitLineResult } from "@/lib/actions/session";
const res = await submitLineResult(itemId, results); // ← RPC tipado
```

Reglas del proyecto:

- Toda action empieza con `requireUser()` ([lib/actions/auth-helpers.ts](lib/actions/auth-helpers.ts)): resuelve el cliente Supabase, el `userId` y el `profile`, y lanza si no hay sesión (backstop del proxy).
- Las actions que cambian datos visibles terminan con `revalidatePath(...)` para invalidar el caché de las páginas.
- Los contratos de datos entre tablero y servidor viven en [lib/study-types.ts](lib/study-types.ts) (`StudyItem`, `StudyMoveResult`, `SubmitResult`) — si cambias el shape, ese es el único lugar.
- Los errores se lanzan como `Error(message)` y el cliente los captura y muestra (`setError`).

## Autenticación y seguridad

Tres capas independientes:

1. **Proxy/middleware** ([lib/supabase/proxy.ts](lib/supabase/proxy.ts)): corre en cada request, refresca el token en cookies (`getClaims()`) y redirige a `/auth/login` si no hay usuario. Rutas públicas: todo `/auth/*`, `/manifest.webmanifest`, `/sw.js`.
2. **`requireUser()`** en cada action/query: defensa en profundidad si algo esquiva el proxy.
3. **RLS en Postgres** (la garantía real): el catálogo es `select`-only para usuarios autenticados; toda tabla de usuario exige `user_id = auth.uid()`. `session_items` y `move_attempts` no llevan `user_id` — heredan la propiedad vía `exists(...)` contra su sesión padre. Aunque el código del servidor tuviera un bug, un usuario no puede leer/escribir filas ajenas.

Los perfiles se crean solos: trigger `on_auth_user_created` → inserta `profiles` con defaults (6 líneas/sesión, bloques de 4, timezone UTC).

**Confirmación de email desactivada**: en Supabase (Auth → Providers → Email) la opción "Confirm email" está apagada, así que `signUp` devuelve una sesión activa de inmediato y [components/sign-up-form.tsx](components/sign-up-form.tsx) redirige directo a `/` (que a su vez manda a `/onboarding` en la primera visita). No hay pantalla intermedia de "revisa tu correo". El route handler [app/auth/confirm/route.ts](app/auth/confirm/route.ts) se conserva porque **sigue en uso para el reset de contraseña** (link del email → `verifyOtp` → `/auth/update-password`). Si algún día se reactiva la confirmación, hay que devolver el `emailRedirectTo` al `signUp` y crear de nuevo una pantalla de aviso.

## Modelo de datos

Dos mundos en el mismo schema ([supabase/schema.sql](supabase/schema.sql)):

**Catálogo global (curado, solo lectura)**

```
openings ─1:N─ opening_lines ─1:N─ line_moves
```

| Tabla | Qué guarda |
|---|---|
| `openings` | Apertura estudiable. `playable_colors`: desde qué lados tiene sentido estudiarla. `detection_keys`: claves para el matcher |
| `opening_lines` | Las 4 líneas teóricas de cada apertura (`rank` 1–4) |
| `line_moves` | Cada media-jugada: `ply` (1-based, impar = blancas), `san`, `explanation` |

**Datos por usuario (RLS)**

```
profiles      user_openings ──▶ openings
user_lines ──▶ opening_lines          (la "tarjeta" SRS)
study_sessions ─1:N─ session_items ──▶ user_lines
                        └─1:N─ move_attempts
user_streaks
```

| Tabla | Qué guarda |
|---|---|
| `profiles` | Usernames externos, preferencias (`lines_per_session`, `moves_per_block`, `analysis_time_controls`, `timezone`), `onboarded_at` |
| `user_openings` | Las aperturas elegidas + color de estudio. `is_active` permite re-onboarding sin perder historial |
| `user_lines` | **La tarjeta SRS**: `state` (new/review), `unlocked_moves`, `interval_days`, `due_date`, `reps`, `lapses`, `last_result` |
| `study_sessions` | Una por usuario por día (`unique(user_id, session_date)`) |
| `session_items` | Cada línea repasada en la sesión; los reintentos crean filas nuevas con `attempt_number+1` (historial completo) |
| `move_attempts` | Cada jugada intentada, con SAN esperado/jugado y tiempo — auditoría y datos futuros |
| `user_streaks` | `current_streak`, `best_streak`, `last_active_date` |

## Motor SRS

Todo en [lib/srs/](lib/srs/), puro y testeado. Sigue la spec del proyecto; donde la spec calla, usa defaults de Anki (SM-2 simplificado).

**Unidad de repetición**: el *bloque acumulado* — la línea siempre se repasa desde la jugada 1 hasta la profundidad desbloqueada (`unlocked_moves` jugadas del estudiante).

**Calificación** ([grading.ts](lib/srs/grading.ts)) — umbral de lentitud: 2 minutos por jugada:

| Situación | bad | mid | good |
|---|---|---|---|
| Primer bloque | cualquier error | sin errores, alguna lenta | limpio |
| Bloque acumulado | >1 error | 1 error o alguna lenta | limpio |

**Scheduler** ([scheduler.ts](lib/srs/scheduler.ts)) — constantes: `EASE = 2.5`, graduación 1d, primer repaso 3d:

| Estado | bad | mid | good |
|---|---|---|---|
| `new` | repite en la sesión | repite en la sesión | gradúa → due mañana + desbloquea bloque |
| `review` | **lapse**: vuelve a `new`, repite en la sesión, intervalo reinicia | due mañana, intervalo no crece | 1d → 3d → ×2.5 sin tope + desbloquea bloque |

**Profundidad**: un `good` limpio desbloquea `moves_per_block` jugadas más (4 → 8 → 10…) hasta agotar la línea (~10 jugadas del estudiante).

**Sesión diaria** ([session-builder.ts](lib/srs/session-builder.ts)): todos los repasos con `due_date <= hoy` + hasta `lines_per_session` líneas nuevas, elegidas round-robin entre aperturas (con shuffle) para variar el menú. Nuevas primero; los fallos se reencolan al final.

**Streak** (en [lib/actions/session.ts](lib/actions/session.ts)): se mantiene al completar ≥3 líneas nuevas distintas en el día — o todas si la sesión trae menos de 3; con el pool de nuevas agotado, completar los repasos cuenta. Solo se contabiliza una vez por día; si `last_active_date` fue ayer, `current_streak + 1`, si no, reinicia en 1.

## Proveedores externos

Dos APIs públicas, **sin tokens ni API keys** ([lib/external/](lib/external/)):

| Proveedor | Endpoint | Detalles |
|---|---|---|
| Lichess | `GET lichess.org/api/games/user/{u}?max=300&opening=true&perfType=…` | ndjson; el tag de apertura viene en cada partida |
| Chess.com | `GET api.chess.com/pub/player/{u}/games/archives` → últimos 3 archivos mensuales | máx. 300 partidas; la apertura se extrae del header `ECOUrl` del PGN |

**Time controls configurables**: `profiles.analysis_time_controls` guarda qué ritmos se analizan (default `{blitz,rapid,slow}`, que replica el comportamiento original). El vocabulario unificado colapsa la asimetría entre APIs; `correspondence` de Lichess queda fuera deliberadamente:

| Preferencia | Lichess `perfType` | Chess.com `time_class` |
|---|---|---|
| `bullet` | bullet | bullet |
| `blitz` | blitz | blitz |
| `rapid` | rapid | rapid |
| `slow` | classical | daily |

**Plataformas**: no hay switch propio — el username es el switch. Dejar un campo vacío en el formulario = no analizar esa plataforma (y el `null` persiste para futuros re-análisis). Se decidió así para no duplicar la verdad ni crear estados inválidos (plataforma "activa" sin username).

Ambos se piden con `cache: "no-store"` y `Promise.allSettled`: si una fuente falla, la otra sigue y el error se reporta como aviso (`sourceErrors`), no como excepción — salvo que fallen las dos.

**Cumplimiento**: los dos clientes mandan `User-Agent: Zephyriov (+APP_CONTACT)` ([user-agent.ts](lib/external/user-agent.ts)). Chess.com limita solo las peticiones **en paralelo**, así que `chesscom.ts` pide los archivos mensuales **en serie** (bucle con `await`) — el acceso serial es ilimitado según su documentación.

**Matcher** ([opening-matcher.ts](lib/external/opening-matcher.ts)): normaliza los nombres (minúsculas, solo `[a-z0-9]`) y compara contra las `detection_keys` del catálogo; **la clave coincidente más larga gana** ("Fantasy Variation" le gana a "Caro-Kann"). Después cuenta partidas por (apertura, color), filtra por `playable_colors` y devuelve el top 3 de cada color — sin repetir una apertura en ambos colores.

## Manejo de fechas

Regla de oro: **el SRS trabaja con strings `yyyy-mm-dd`, nunca con `Date` en operaciones de dominio.** Eso elimina bugs de timezone/DST y permite comparar con `<=` lexicográfico.

- **"Hoy" es del usuario, no del servidor**: `getToday(profile.timezone)` ([lib/dates.ts](lib/dates.ts)) formatea la fecha actual en la timezone IANA del perfil (`Intl.DateTimeFormat("en-CA")` produce yyyy-mm-dd). El rollover del día — cuándo aparece una sesión nueva — sigue la timezone configurada en Settings.
- **Aritmética**: `addDays(isoDate, n)` ([scheduler.ts](lib/srs/scheduler.ts)) opera en UTC puro (`T00:00:00Z`) para que sumar días jamás drifte por DST.
- **Override en desarrollo**: la cookie `zephyriov-dev-date` reemplaza "hoy" (solo con `NODE_ENV=development`) para simular el paso de días.
- **Columnas**: `due_date` y `session_date` son `date` en Postgres y viajan como strings; los timestamps de auditoría (`created_at`, `completed_at`…) sí son `timestamptz`.

## El tablero de estudio

[components/study/study-session.tsx](components/study/study-session.tsx) — un solo componente cliente maneja todo el quiz:

- **Estado**: una instancia de `chess.js` en un `useRef` es la fuente de verdad de la posición; el FEN en estado re-renderiza `react-chessboard`.
- **Dos formas de mover, una sola lógica**: drag (`onPieceDrop`) y click-click (`onSquareClick`, estilo lichess/chess.com, sin premoves) convergen en `tryMove(from, to)`:
  - Click en pieza propia → selección (anillo dorado) + destinos legales (punto en vacías, anillo en capturas, vía `squareStyles`).
  - Click en destino ejecuta; click en la misma pieza deselecciona; `canDragPiece` limita el arrastre a las piezas del estudiante.
  - Jugada ilegal → rebota sin penalización. Incorrecta → se muestra 900 ms, se deshace y se revela la jugada de teoría. Promoción: siempre dama.
- **El rival juega solo** sus plies con 600 ms de delay (efecto en `useEffect` sobre el ply actual).
- **Timer por jugada** ([move-timer.tsx](components/study/move-timer.tsx)): cronómetro visual que se pone rojo al pasar el umbral de 2 min; el tiempo real usado para calificar se mide en `tryMove` (`elapsedMs`).
- **Fin del bloque** → `submitLineResult` (ver [flujo B](#b-una-jugada-en-la-sesión-de-estudio-el-flujo-central)); si el servidor reencola la línea, el cliente la agrega al final de su cola local.

## UI: diseño vintage

Estética de cartel impreso años 20–50 (papel envejecido + rojo cartel + teal de fuente de sodas + tinta cálida), inspirada en UI kits retro y portadas constructivistas de ajedrez:

- **Tokens** en [app/globals.css](app/globals.css): además de los tokens shadcn, `--ink`, `--teal`, `--gold` y `--paper` (expuestos en Tailwind como `ink/teal/gold/paper`, ver [tailwind.config.ts](tailwind.config.ts)). El fondo lleva un grano de medios tonos sutil. Hay variante `.dark` en papel chocolate.
- **Tipografía**: Alfa Slab One (`font-display`, h1–h3 y marca), Oswald (`font-label`, botones/etiquetas en mayúsculas con tracking), Geist para cuerpo. Cargadas en [app/layout.tsx](app/layout.tsx) con `next/font`.
- **Clases utilitarias** (`@layer components`): `card-vintage` (borde 2px tinta + sombra dura offset `shadow-press`), `label-vintage` (mayúsculas condensadas), `ribbon` (banner con puntas bifurcadas vía clip-path; sin borde/sombra porque clip-path los recorta).
- **Componentes**: botones con sombra dura que se "presiona" en `:active`; inputs píldora con foco dorado; header como franja roja de cartel; racha en sello dentado SVG ([streak-seal.tsx](components/streak-seal.tsx)); divisores con estrellas ([star-divider.tsx](components/star-divider.tsx)).
- **Tablero**: casillas crema/teal a juego con la paleta, marco tipo gabinete teal, coordenadas coloreadas por casilla (constantes `BOARD_LIGHT`/`BOARD_DARK` en study-session.tsx).

## Catálogo de aperturas

14 aperturas × 4 líneas × ~10 jugadas del estudiante (1,120 medias-jugadas con explicación en inglés): Ponziani, Caro-Kann Fantasy, French Two Knights, Italian, Ruy Lopez, Vienna, London, Queen's Gambit, Sicilian Dragon, Modern, Caro-Kann, French, Scandinavian, King's Indian.

**Formato fuente** (un archivo por apertura en [scripts/catalog/](scripts/catalog/)):

```js
export default {
  slug: "ponziani",
  name: "Ponziani Opening",
  eco: "C44",
  playableColors: ["white"],
  detectionKeys: ["ponziani"],
  lines: [
    { rank: 1, name: "Main Line: 3...Nf6 4.d4",
      moves: [["e4", "Claim the center..."], ["e5", "..."], /* [san, explicación] */] },
  ],
};
```

**Para editar el catálogo**: modifica/agrega los `.mjs`, regístralo en `scripts/catalog/index.mjs`, corre `node scripts/generate-seed.mjs` (valida cada secuencia con chess.js: legalidad, SAN canónico, ranks duplicados) y re-ejecuta `supabase/seed.sql` en Supabase.

## Librería de aperturas

`/library` (link "Library" en el header) muestra el catálogo completo — cada apertura con su ECO, colores jugables y las 4 líneas en notación de texto (generada por [lib/notation.ts](lib/notation.ts)) — y permite gestionar el estudio a mano, como alternativa o complemento al análisis automático:

- **Add to my studies** ([lib/actions/library.ts](lib/actions/library.ts) `addOpening`): upsert de `user_openings` (sin tocar el resto de la selección, a diferencia de `confirmOpenings`) + creación de las tarjetas SRS faltantes.
- **Remove from studies** (`removeOpening`): marca `is_active = false`. Las `user_lines` **no se tocan**: re-agregar la apertura con el mismo color recupera el progreso; con el color contrario, se resetea (las jugadas calificadas cambian de lado). Si se quita una apertura con líneas pendientes en la sesión de hoy, esos `session_items` se borran y el estado de la sesión se recalcula — sin esto la sesión quedaría incompletable.
- **Sustituir** una apertura auto-detectada = Remove + Add en la misma página.

En onboarding, el tab **"Build my own"** usa el mismo catálogo ([components/onboarding/opening-picker.tsx](components/onboarding/opening-picker.tsx)) para armar el repertorio sin analizar partidas; ambos tabs alimentan la misma selección, así que se pueden mezclar. Nota: `/library` es accesible antes de completar el onboarding pero no marca `onboarded_at` — el Home seguirá llevando a `/onboarding` hasta confirmar ahí (un solo punto de verdad).

## Tests

```
pnpm test
```

Vitest cubre el motor SRS puro ([lib/srs/__tests__/](lib/srs/__tests__/)): calificación de bloques (primer bloque vs acumulado, errores, lentitud), scheduler (graduación, lapses, crecimiento de intervalos, desbloqueo de profundidad) y armado de sesión (due filtering, round-robin, pool agotado). La lógica con I/O (actions) se mantiene delgada precisamente para que lo testeable esté aquí.

## PWA

- [app/manifest.ts](app/manifest.ts): manifest con nombre, colores del tema e iconos (192/512, generados con `node scripts/generate-icons.mjs`).
- [public/sw.js](public/sw.js): service worker mínimo — existe para cumplir el criterio de instalabilidad, no cachea de forma agresiva.
- [components/sw-register.tsx](components/sw-register.tsx): lo registra en el cliente; su fallo es no-fatal.

## Licencia y atribuciones

Zephyriov se distribuye bajo la **[licencia MIT](LICENSE)**. Dos documentos de apoyo:

| Documento | Para qué |
|---|---|
| **[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)** | Qué usamos y bajo qué licencia: dependencias, tipografías, arte de las piezas, APIs, catálogo |
| **[LICENSING.md](LICENSING.md)** | Estrategia: cómo migrar a BSL si algún día se comercializa, y qué faltaría para vender |

Lo que conviene saber sin abrir ninguno de los dos:

- **Las piezas del tablero no son arte de `react-chessboard`**: son el set de **Cburnett** (Wikimedia Commons), multi-licenciado. Zephyriov las usa bajo la **opción BSD 3-Clause**, que es la única sin copyleft/ShareAlike — eso mantiene el proyecto MIT limpio y permite un futuro cambio a BSL. La atribución es obligatoria; usar el nombre del autor para promocionar, no.
- **`chess.js` es BSD-2-Clause**, no MIT — su aviso de copyright debe viajar con cada distribución.
- **Las fuentes se auto-hospedan** (`next/font`), así que las redistribuimos: Alfa Slab One, Oswald y Geist son **SIL OFL 1.1**.
- **Nada de lo que se distribuye es GPL/AGPL.** El software de Lichess es AGPL, pero solo consumimos su API por HTTP — eso no dispara la AGPL. **No copiar código de lila** o el proyecto tendría que volverse AGPL.
- **Uso comercial permitido** por los ToS de Lichess. Chess.com pide respetar su IP (paletas, diseños de piezas, sonidos) — no usamos nada de eso.

- **Cumplimiento de APIs**: ambos clientes mandan un `User-Agent` identificando la app ([lib/external/user-agent.ts](lib/external/user-agent.ts)). Define **`APP_CONTACT`** para que Chess.com pueda avisarte antes de bloquear la app; sin esa variable el header sale sin contacto.

### Mantener la puerta abierta a BSL

El proyecto puede relicenciarse a BSL en cualquier momento **porque hay un solo titular del copyright**. Lo único que hay que cuidar activamente para no perder esa opción:

> **No mergear PRs externos sin acuerdo previo.** El autor de un aporte conserva su copyright: bajo MIT puedes usarlo, pero **no relicenciarlo a BSL** sin su permiso. Mientras el proyecto sea de un solo autor no hay nada que hacer; el día que llegue el primer PR, ver [LICENSING.md §2](LICENSING.md#2-la-única-base-que-hay-que-mantener-contribuciones).

Lo demás ya está puesto: cero copyleft en runtime, piezas bajo BSD-3, fuentes OFL (empaquetables comercialmente) y Lichess con uso comercial permitido. Al agregar dependencias o assets, corre `pnpm licenses list --prod` y actualiza las notas — ver [THIRD-PARTY-NOTICES §12](THIRD-PARTY-NOTICES.md#12-cómo-regenerar-este-inventario).

## Guía rápida: ¿dónde toco para…?

| Quiero… | Archivo(s) |
|---|---|
| Cambiar cómo se califica un bloque | [lib/srs/grading.ts](lib/srs/grading.ts) (+ sus tests) |
| Cambiar intervalos/ease del scheduler | [lib/srs/scheduler.ts](lib/srs/scheduler.ts) (+ sus tests) |
| Cambiar qué entra en la sesión diaria | [lib/srs/session-builder.ts](lib/srs/session-builder.ts) |
| Cambiar la regla del streak | `updateStreak` en [lib/actions/session.ts](lib/actions/session.ts) |
| Tocar el tablero / interacción de jugadas | [components/study/study-session.tsx](components/study/study-session.tsx) |
| Agregar o editar una apertura | [scripts/catalog/](scripts/catalog/) + `node scripts/generate-seed.mjs` |
| Tocar la librería (add/remove de aperturas) | [lib/actions/library.ts](lib/actions/library.ts) + [lib/queries/library.ts](lib/queries/library.ts) + [components/library/](components/library/) |
| Cambiar los time controls analizados | `analysis_time_controls` en [supabase/schema.sql](supabase/schema.sql), mapeos en [lib/external/lichess.ts](lib/external/lichess.ts) / [chesscom.ts](lib/external/chesscom.ts), UI en [components/time-control-picker.tsx](components/time-control-picker.tsx) |
| Cambiar la detección de aperturas | [lib/external/opening-matcher.ts](lib/external/opening-matcher.ts) y `detection_keys` del catálogo |
| Agregar un proveedor de partidas | nuevo cliente en [lib/external/](lib/external/) + sumarlo en `analyzeOpenings` |
| Cambiar colores/tipografías/estética | [app/globals.css](app/globals.css) + [tailwind.config.ts](tailwind.config.ts) |
| Agregar una página protegida | `app/<ruta>/page.tsx` con el patrón Suspense + `PageFallback` (el proxy ya la protege) |
| Hacer pública una ruta | `publicPaths` / condición `/auth` en [lib/supabase/proxy.ts](lib/supabase/proxy.ts) |
| Cambiar datos que ve el Home/Progress | [lib/queries/dashboard.ts](lib/queries/dashboard.ts) |
| Agregar una columna a una tabla | [supabase/schema.sql](supabase/schema.sql) + espejo en [lib/db/types.ts](lib/db/types.ts) |
| Simular otro día en dev | cookie `zephyriov-dev-date` (ver [Manejo de fechas](#manejo-de-fechas)) |
| Agregar una dependencia o un asset | `pnpm licenses list --prod` + anotar en [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) (rechaza GPL/AGPL/CC BY-SA en runtime) |
| Cambiar la licencia del proyecto | [LICENSE](LICENSE) + la guía de migración en [LICENSING.md §4](LICENSING.md#4-cómo-migrar-a-bsl-11-cuando-toque) |
| Aceptar el primer PR externo | [LICENSING.md §2](LICENSING.md#2-la-única-base-que-hay-que-mantener-contribuciones) **antes** de mergear |
| Empezar a cobrar por la app | Checklist en [LICENSING.md §5](LICENSING.md#5-qué-falta-para-que-sea-comerciable) |
