# Branch changes

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
