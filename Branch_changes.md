# Branch changes

## 2026-07-19 — Fix: la última línea saltaba a la pantalla final sin dejar leer el grading

- **Síntoma**: al contestar la última línea de la sesión, el panel de grading (badge + explicación) se cargaba y desaparecía solo, redirigiendo a la pantalla de "sesión completa" sin dar chance de leerlo ni de pulsar *Continue*.
- **Causa**: `submitLineResult` ([lib/actions/session.ts](lib/actions/session.ts)) terminaba con `revalidatePath("/")`. En el App Router, revalidar desde un server action también refresca el árbol RSC de la **ruta actual**: `/study` se re-renderizaba en el servidor y, con el último ítem ya calificado, `pendingItems` quedaba vacío, así que [app/study/page.tsx](app/study/page.tsx:29) sustituía el `<StudySession>` (y su panel de grading) por la tarjeta "All done for today".
- **Fix**: se eliminó ese `revalidatePath`. El dashboard `/` es dinámico (lee cookies vía Supabase, no hay nada cacheado), así que ya refetcheaba en cada visita — la revalidación no aportaba nada y solo provocaba el salto. Ahora la pantalla final llega solo al pulsar *Continue*, como el resto de las líneas.
- Verificado: `tsc --noEmit` en verde. La reproducción end-to-end en navegador no se corrió (requiere una sesión con línea pendiente en la DB viva); el cambio es una eliminación de una sola línea con causa identificada en el código.

[Listo :v]

## 2026-07-17 — Fix: líneas sin movimientos en la librería (tope de filas de PostgREST)

- **Síntoma**: tras ampliar a 6 líneas, en `/library` varias líneas (las rank 5–6 y las aperturas nuevas) mostraban solo el nombre, sin la secuencia de movimientos. Los datos SÍ estaban en la base (la migración corrió bien); el problema era de lectura.
- **Causa**: [lib/queries/library.ts](lib/queries/library.ts) traía **todos** los `line_moves` en una sola query sin paginar. PostgREST corta cada respuesta al tope `max-rows` (1000 por defecto). El catálogo pasó de 1,120 a **1,920 filas** de movimientos, así que la respuesta se truncaba y se perdían las últimas filas insertadas — justo los ranks 5–6 y las aperturas nuevas (los nombres venían de otra query de solo 96 filas, bajo el tope, por eso sí aparecían).
- **Fix**: nuevo helper [lib/supabase/paginate.ts](lib/supabase/paginate.ts) (`fetchAllRows`) que pagina con `.range()` hasta traer todas las filas, con `.order("id")` para que el paginado sea determinista. Aplicado a los tres puntos que hacen fetch masivo de `line_moves`: `library.ts` (el bug visible) y, de forma preventiva, `lib/queries/dashboard.ts` y `lib/actions/session.ts` (calculan la profundidad de cada carta; se truncarían igual si un usuario llegara a estudiar casi todo el catálogo = 1,920 filas, dando profundidad incorrecta).
- Verificado: lógica de paginación probada en todos los bordes (0, 999, 1000, 1001, 1920, 3000 filas → correcto, incluido el caso exacto de 1000); typecheck, lint y build de producción en verde. **Nota de deploy**: es cambio de código de la app — en local ya aplica; en producción requiere redeploy en Vercel.

[Listo :v]

## 2026-07-17 — Catálogo a 6 líneas por apertura + Hyper-Accelerated Dragon y King's Gambit

- **Catálogo ampliado de 14×4 a 16×6** (96 líneas, 1,920 medias-jugadas): +2 líneas (ranks 5–6) en cada una de las 14 aperturas existentes (ej. Ruy Lopez → Open y Marshall; Queen's Gambit → Semi-Slav Meran y Tarrasch; Caro-Kann → Karpov y Tartakower; Vienna → Frankenstein-Dracula y Gambito Aceptado) y 2 aperturas nuevas con 6 líneas: **Sicilian Hyper-Accelerated Dragon** (B27) y **King's Gambit** (C30). Las líneas rank 1–4 existentes no se tocaron (su progreso SRS vive en esos `line_id`).
- **Cero cambios de comportamiento en sesión/progresión**: `lib/srs/`, actions y UI ya eran agnósticos al número de líneas — solo crece el pool de líneas nuevas que el session builder reparte con el mismo `lines_per_session` (24→36 líneas con 6 aperturas ≈ de 4 a 6 días para verlas todas al menos una vez).
- **Contenido siguiendo la metodología de curaduría**: selección y jugadas cotejadas contra Wikibooks "Chess Opening Theory" (la Lichess Masters DB —vía el nuevo `scripts/verify-lines.mjs`— quedó pendiente: su API exigía autenticación ese día; el script queda listo con caché y modo `--explore`). Trazabilidad por archivo en comentario de cada `.mjs` (fuente + fecha + qué es libro y qué es extensión natural). Nota de fuentes en THIRD-PARTY-NOTICES §9 (solo se cotejaron jugadas —hechos—; ninguna prosa copiada).
- **`generate-seed.mjs` ahora emite dos archivos**: `supabase/seed.sql` completo (instalaciones frescas) y la migración delta **`supabase/migrations/2026-07-17-six-lines-and-new-openings.sql`** — lo único que hay que pegar en la DB viva: amplía el check de `opening_lines.rank` a 1–6, inserta solo el contenido nuevo (con `on conflict do nothing`, re-pegable) y **backfillea las `user_lines` faltantes** de las aperturas activas (sin esto, los usuarios existentes jamás verían los ranks 5–6 — no existía ningún código que las creara). `schema.sql` actualizado para instalaciones frescas.
- Verificado: `generate-seed` sin errores (16/96/1,920), 29 tests Vitest, lint, typecheck y build de producción en verde. **Pendiente del usuario: pegar la migración delta en el SQL editor de Supabase** (y la de `2026-07-16-analysis-time-controls.sql` si aún no se corrió). Correr `node scripts/verify-lines.mjs` cuando el explorer vuelva a ser público.

[Listo :v]

## 2026-07-17 — Metodología de curaduría del catálogo (teoría real)

- **Auditoría de la documentación existente**: lo que README/THIRD-PARTY-NOTICES documentaban sobre `supabase/seed.sql` era el *pipeline técnico* (`scripts/catalog/*.mjs` → `generate-seed.mjs` → SQL) y su *validación mecánica* (chess.js: legalidad + SAN canónico) — no una metodología de *contenido* teórico. THIRD-PARTY-NOTICES.md §9 ya reconocía honestamente que las 14 aperturas originales fueron redactadas con asistencia de IA y solo pasaron el chequeo de legalidad, sin verificación contra teoría real (base de partidas, ECO/MCO, etc.).
- **Se documentó una metodología nueva** en el README (sección "Metodología de curaduría" dentro de "Catálogo de aperturas"): identificar la apertura contra clasificación ECO estándar, elegir las 4 líneas por frecuencia real en bases de partidas de nivel fuerte (no preferencia editorial), recabar las jugadas contra una fuente teórica primaria en vez de memoria, explicar cada jugada según el plan real de esa fuente, y dejar trazabilidad (fuente + fecha) por línea en cada `.mjs`. Aplica hacia adelante; las 14 aperturas existentes quedan marcadas como pendientes de auditoría contra este estándar (referenciado también desde THIRD-PARTY-NOTICES.md §9).

[Listo :v]

## 2026-07-17 — Fix del header roto en móvil

- **`AppHeader` desbordaba en pantallas angostas**: el logo + los 3 links + el botón Logout no cabían en el ancho de un móvil (375px), empujando "Logout" fuera de la vista (confirmado con overflow real de 455px vs 375px de viewport). Se redujeron gap/padding/tamaño de fuente del nav y del logo en mobile (clases base más chicas, `sm:` restaura el tamaño original desde 640px), y el botón de Logout usa menos padding horizontal en mobile. Verificado en el navegador a 375px (sin overflow) y a 1280px (tamaño original intacto).

[Listo :v]

## 2026-07-16 — Fix del setup congelado + librería de aperturas, UX de estudio y preferencias de análisis

- **Fix: onboarding congelado al confirmar.** `confirmOpenings` ahora redirige a `/` desde el servidor (tras escribir `onboarded_at`) y revisa los errores de sus updates que antes se tragaba. En el cliente, el error `NEXT_REDIRECT` que toda action con `redirect()` lanza se reconoce y se ignora (el router navega solo); antes se pintaba en pantalla y su `setState` abortaba la navegación.
- **Librería de aperturas (`/library`)**: catálogo completo con las 4 líneas de cada apertura en notación de texto (`lib/notation.ts`, con tests). Add/remove al estudio (`lib/actions/library.ts`): quitar conserva el progreso (`is_active = false`); re-agregar con el mismo color lo recupera, con el color contrario lo resetea. Al quitar una apertura con líneas pendientes hoy, sus `session_items` se borran y la sesión se recalcula (sin esto quedaba incompletable). Sustituir = remove + add. Link "Library" en el header y en Settings.
- **Onboarding con dos modos**: "Analyze my games" (flujo original) y "Build my own" (checkboxes sobre el catálogo, `opening-picker.tsx`). Ambos alimentan la misma selección — se pueden mezclar.
- **Sesión de estudio**: la explicación de la última jugada ya no es reemplazada por el panel de calificación — coexisten. El panel ahora dice cuándo vuelve la línea con la fecha real del scheduler (`nextDue` en `SubmitResult`; null cuando repite en la misma sesión, lo que también evita mostrar la fecha vieja del lapse).
- **Time controls configurables**: columna `profiles.analysis_time_controls` (default `{blitz,rapid,slow}` = comportamiento original; `slow` = classical en Lichess, daily en Chess.com). Chips en onboarding y Settings; el análisis los persiste. Plataforma = username (campo vacío = no analizar; sin columnas nuevas). **Pendiente: ejecutar `supabase/migrations/2026-07-16-analysis-time-controls.sql` en el SQL editor** (la base ya existía).
- Verificado: typecheck, lint, 29 tests de Vitest y build de producción en verde. Los flujos autenticados (library, onboarding manual, sesión) quedan por probar en vivo tras correr la migración.

[Listo :v]

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

## 2026-07-16 — Sign-up sin confirmación de correo

- Con la confirmación de email desactivada en Supabase, `signUp` ya devuelve sesión activa: `components/sign-up-form.tsx` ahora redirige directo a `/` (que enruta a `/onboarding` en la primera visita) en vez de a la pantalla "revisa tu correo". Se quitó también la opción `emailRedirectTo`, que solo servía para el link de confirmación.
- Eliminada `app/auth/sign-up-success/` — quedaba huérfana (su único enlace era esa redirección) y su texto ya era falso. El route handler `app/auth/confirm/route.ts` se conserva: sigue usándose para el reset de contraseña.
- Documentado en README (sección Autenticación y seguridad). Verificado: typecheck, lint y build de producción en verde; la página de sign-up renderiza sin errores. El envío del formulario no se probó porque implicaría crear una cuenta real.

[Listo :v]

## 2026-07-16 — Licenciamiento y atribuciones

- `LICENSE`: MIT (titular `MoyyyL` — **confirmar el nombre legal**), con nota de que no cubre dependencias/assets de terceros.
- `THIRD-PARTY-NOTICES.md` nuevo: inventario completo verificado contra los paquetes instalados (`pnpm licenses list`) y contra los términos publicados de cada proveedor. Cubre dependencias de runtime y build, tipografías, arte de piezas, plantilla/shadcn, APIs, catálogo, inspiración de diseño y checklist para migrar a BSL.
- **Hallazgo importante**: las piezas del tablero no son arte de `react-chessboard` (MIT) — son el set **Cburnett** de Wikimedia Commons, incorporado sin atribución upstream. Está multi-licenciado (GFDL / CC BY-SA 3.0 / GPLv2+ / **BSD-3-Clause**); el proyecto elige explícitamente **BSD-3-Clause** para evitar ShareAlike y dejar viable un futuro BSL.
- Otros puntos no obvios documentados: `chess.js` es BSD-2-Clause (no MIT); las fuentes se auto-hospedan y por tanto se redistribuyen bajo OFL 1.1; la AGPL de Lichess no aplica por consumir su API vía HTTP (solo si se copiara código de lila); Chess.com exige respetar su IP de piezas/paletas (no usamos ninguna); el catálogo es contenido original asistido por IA (nota sobre protegibilidad).
- `package.json`: agregado `"license": "MIT"`. README: sección "Licencia y atribuciones" + entradas en la guía rápida.
[Listo :v]

## 2026-07-16 — User-Agent para las APIs de ajedrez

- `lib/external/user-agent.ts` nuevo: construye `Zephyriov (+<APP_CONTACT>)`. El contacto sale de la variable de entorno **`APP_CONTACT`** en vez de estar hardcodeado, para no publicar un correo personal en un repo abierto; sin la variable el header identifica la app pero sin contacto.
- Aplicado a los dos clientes: `chesscom.ts` (ambas peticiones: archives + archivos mensuales) y `lichess.ts` (no lo exige, pero identificarse con un servidor sin fines de lucro es lo correcto).
- Documentado en `.env.example`, README (setup, proveedores, módulos, licencias) y THIRD-PARTY-NOTICES §8.
- Verificado interceptando `fetch` con un test temporal de Vitest: con `APP_CONTACT` ambos hosts reciben `Zephyriov (+dev@example.com)`; sin ella, `Zephyriov`. Test borrado tras verificar. Suite completa (25 tests), typecheck y lint en verde.

[Listo :v]

## 2026-07-16 — Bases para BSL y checklist de comercialización

- `LICENSING.md` nuevo: estrategia de licencia, separada del inventario de terceros. Cubre (1) por qué hoy se puede relicenciar —titular único— y los 4 riesgos que lo romperían, (2) la política de contribuciones, (3) las bases ya puestas, (4) guía de migración a BSL 1.1 y (5) checklist de comercialización.
- **La base clave**: mientras haya un solo autor no hay nada que hacer, pero **mergear un PR externo sin acuerdo previo cierra la puerta a BSL** (el contribuidor conserva su copyright y bajo MIT no se puede relicenciar sin su permiso). Documentadas las 3 salidas: no aceptar PRs (recomendado hoy), DCO o CLA. También anotado que el MIT ya publicado es irrevocable para esas versiones: BSL solo aplica hacia adelante.
- Parámetros de BSL 1.1 verificados contra el texto oficial y la FAQ de MariaDB: Change Date máx. 4 años desde la primera distribución pública; Change License debe ser GPLv2+ o compatible (**MIT lo es**, así que puede "volver" a MIT); no es OSI-approved.
- Checklist de comercialización (nada bloqueante para desplegar): nombre legal en LICENSE, entidad, marca; **Aviso de Privacidad (LFPDPPP) y borrado/exportación de cuenta** —hoy no existen en la app y son lo primero que haría falta desde el primer usuario ajeno—; consulta a `legal@chess.com`; planes de pago + DPA de Supabase/Vercel; página `/licenses` in-app (necesaria si el repo se cierra bajo BSL); ToS; pagos; `SECURITY.md`; proyecto Supabase separado para prod.
- THIRD-PARTY-NOTICES §11 recortado para no duplicar: ahora solo lo que se deriva del inventario y apunta a LICENSING.md. README con tabla de los tres documentos y entradas nuevas en la guía rápida.
- Verificado: los 108 enlaces internos de los 4 documentos resuelven (incluidos anchors, con el algoritmo de slug de GitHub).

[Listo :v]
