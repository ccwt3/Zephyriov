# Third-party notices and attributions

Zephyriov se distribuye bajo la [licencia MIT](LICENSE). Este documento cubre **todo lo demás**: las dependencias que se empaquetan, las tipografías que se auto-hospedan, el arte de las piezas, las APIs que se consumen y el contenido del catálogo.

> **Aviso**: este documento es un inventario técnico de licencias, verificado contra los archivos realmente instalados y contra los términos publicados por cada proveedor. **No es asesoría legal.** Para uso comercial o un cambio de licencia (ej. BSL), consulta a un abogado.

Última verificación: **2026-07-16**, contra el árbol de `pnpm-lock.yaml` vigente.

---

## Índice

1. [Resumen: obligaciones que sí aplican](#1-resumen-obligaciones-que-sí-aplican)
2. [Arte de las piezas de ajedrez (atención)](#2-arte-de-las-piezas-de-ajedrez-atención)
3. [Motor de ajedrez: chess.js (BSD-2-Clause)](#3-motor-de-ajedrez-chessjs-bsd-2-clause)
4. [Tipografías (SIL OFL 1.1)](#4-tipografías-sil-ofl-11)
5. [Dependencias de runtime](#5-dependencias-de-runtime)
6. [Dependencias de build/desarrollo](#6-dependencias-de-builddesarrollo)
7. [Plantilla y componentes base](#7-plantilla-y-componentes-base)
8. [Fuentes de datos: APIs de Lichess y Chess.com](#8-fuentes-de-datos-apis-de-lichess-y-chesscom)
9. [Contenido del catálogo de aperturas](#9-contenido-del-catálogo-de-aperturas)
10. [Inspiración de diseño](#10-inspiración-de-diseño)
11. [Notas para un cambio a BSL](#11-notas-para-un-cambio-a-bsl)
12. [Cómo regenerar este inventario](#12-cómo-regenerar-este-inventario)

---

## 1. Resumen: obligaciones que sí aplican

De todo lo que usa el proyecto, esto es lo que **obliga a hacer algo** al distribuir:

| Qué | Licencia | Obligación real |
|---|---|---|
| Arte de las piezas (Cburnett, vía react-chessboard) | Multi-licencia; **elegimos BSD-3-Clause** | Conservar aviso de copyright + no usar el nombre del autor para promocionar |
| `chess.js` | BSD-2-Clause | Reproducir el aviso de copyright y el disclaimer en la documentación |
| Alfa Slab One, Oswald, Geist | SIL OFL 1.1 | Conservar el aviso + la licencia; no vender las fuentes solas; no usar los Reserved Font Names en versiones modificadas |
| Todo lo MIT / ISC / Apache-2.0 / BSD | varias | Conservar avisos de copyright y licencia |
| APIs de Lichess / Chess.com | Términos de servicio | Respetar rate limits y la IP de cada plataforma (ver §8) |

**Ninguna dependencia es copyleft fuerte (GPL/AGPL) en el código que se distribuye**, así que no hay obligación de liberar el código fuente. Ver §11.

---

## 2. Arte de las piezas de ajedrez (atención)

> Este es el punto de licenciamiento **menos obvio y más importante** del proyecto.

Las piezas que dibuja el tablero **no son arte original de `react-chessboard`**. La librería es MIT (Ryan Gregory), pero sus `defaultPieces` incorporan el conjunto SVG estándar de **Colin M. L. Burnett ("Cburnett")**, publicado en Wikimedia Commons. Lo verificamos comparando los datos de trazado del bundle (`viewBox` de 45×45 y paths idénticos, p. ej. el peón `m 22.5,9 c -2.21,0 -4,1.79 -4,4 …`) contra el conjunto canónico de Commons.

`react-chessboard` no declara esta procedencia en su README ni en su LICENSE, así que **la atribución la hacemos nosotros** para quedar del lado seguro.

### Multi-licencia y nuestra elección

Cburnett publicó las piezas bajo **cuatro licencias a elección del usuario**:

- GNU Free Documentation License 1.2 o posterior
- Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)
- GNU General Public License v2 o posterior
- **BSD 3-Clause** ← *la que elige Zephyriov*

**Zephyriov usa estas piezas bajo la opción BSD 3-Clause.** Es la única de las cuatro que no arrastra copyleft ni ShareAlike, así que:

- no contamina la licencia MIT del proyecto,
- no obliga a licenciar la app (ni sus capturas) bajo CC BY-SA,
- y **sobrevive a un futuro cambio a BSL** (ver §11), cosa que CC BY-SA y GPL complicarían.

### Atribución requerida

```
Chess piece artwork: Copyright (c) Colin M. L. Burnett
Source: https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces
Used under the BSD 3-Clause License option of the author's multi-license grant.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. The name of the author may not be used to endorse or promote products
   derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

Cláusula 3: **no podemos usar el nombre de Cburnett para promocionar Zephyriov** (ej. "las piezas oficiales de Cburnett") sin permiso escrito. Atribuir es obligatorio; promocionar con su nombre, no.

### Si algún día cambian las piezas

Si se reemplazan por un set propio o por otro set (Merida, Alpha, Maestro…), hay que revisar **su** licencia y actualizar esta sección. Ojo: muchos sets populares de chess.com/lichess **no** son libres (ver §8).

---

## 3. Motor de ajedrez: chess.js (BSD-2-Clause)

`chess.js` **no es MIT** (es la única dependencia de runtime que no lo es). BSD-2-Clause obliga a reproducir el aviso en la documentación de las distribuciones binarias — este archivo cumple esa función:

```
Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

`chess.js` se usa en dos lugares: el tablero de estudio (validación/SAN en el cliente) y `scripts/generate-seed.mjs` (validación del catálogo en build).

---

## 4. Tipografías (SIL OFL 1.1)

`next/font/google` **descarga y auto-hospeda** los archivos de fuente en el build, así que Zephyriov **redistribuye** las fuentes y la OFL aplica de lleno.

| Fuente | Uso | Copyright | Licencia |
|---|---|---|---|
| **Alfa Slab One** | `--font-display`: títulos y marca | Copyright 2016 The Alfa Slab One Project Authors (http://www.jmsole.cl \| info@jmsole.cl), with Reserved Font Name "Alfa Slab" | SIL OFL 1.1 |
| **Oswald** | `--font-label`: etiquetas y botones | Copyright 2016 The Oswald Project Authors (https://github.com/googlefonts/OswaldFont) | SIL OFL 1.1 |
| **Geist** | Cuerpo de texto | Copyright Vercel, Inc. (con Basement Studio y Andrés Briganti) | SIL OFL 1.1 |

Texto de la licencia: <https://openfontlicense.org/open-font-license-official-text/>

Obligaciones de la OFL 1.1 que aplican aquí:

- **Conservar** el aviso de copyright y la licencia al redistribuir las fuentes (este archivo lo hace).
- **No vender las fuentes por sí solas** (venderlas *dentro* de un producto de software sí está permitido).
- Si se **modifica** una fuente, no puede conservar su *Reserved Font Name* ("Alfa Slab").
- Una fuente OFL modificada debe seguir siendo OFL.

Servir las fuentes como parte de la web app es distribución normal y está permitida.

---

## 5. Dependencias de runtime

Inventario generado con `pnpm licenses list --prod` (**73 paquetes MIT**, más los que se listan aparte). Verificado el 2026-07-16.

### MIT (73 paquetes)

Framework y React: `next@16.2.10` (Copyright © 2025 Vercel, Inc.), `react@19.2.7`, `react-dom@19.2.7`, `scheduler`, `styled-jsx`, `client-only`, `@next/env`, `@next/swc-win32-x64-msvc`, `next-themes@0.4.6`, `nanoid`, `postcss`, `csstype`, `cookie`, `iceberg-js`, `@img/colour`.

Supabase (Copyright © 2020 Supabase): `@supabase/supabase-js`, `@supabase/ssr`, `@supabase/auth-js`, `@supabase/postgrest-js`, `@supabase/realtime-js`, `@supabase/storage-js`, `@supabase/functions-js`, `@supabase/phoenix`.

Radix UI (Copyright © WorkOS): `@radix-ui/react-checkbox`, `react-dropdown-menu`, `react-label`, `react-slot`, `react-menu`, `react-popper`, `react-portal`, `react-presence`, `react-primitive`, `react-arrow`, `react-collection`, `react-context`, `react-direction`, `react-dismissable-layer`, `react-focus-guards`, `react-focus-scope`, `react-id`, `react-roving-focus`, `react-use-callback-ref`, `react-use-controllable-state`, `react-use-effect-event`, `react-use-is-hydrated`, `react-use-layout-effect`, `react-use-previous`, `react-use-rect`, `react-use-size`, `primitive`, `rect`.

Tablero y drag-and-drop: **`react-chessboard@5.10.0`** (Copyright © 2022 Ryan Gregory — **ver §2 sobre el arte de las piezas**), `@dnd-kit/core`, `@dnd-kit/accessibility`, `@dnd-kit/modifiers`, `@dnd-kit/utilities` (Copyright © Claudéric Demers).

Utilidades: `clsx`, `tailwind-merge`, `aria-hidden`, `detect-node-es`, `get-nonce`, `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`, `use-callback-ref`, `use-sidecar`, `@floating-ui/core`, `@floating-ui/dom`, `@floating-ui/react-dom`, `@floating-ui/utils`, `@types/react`, `@types/react-dom`.

### No-MIT en runtime

| Paquete | Licencia | Nota |
|---|---|---|
| `chess.js@1.4.0` | **BSD-2-Clause** | Aviso completo en §3 |
| `class-variance-authority@0.7.1` | Apache-2.0 | Copyright © Joe Bell. Requiere conservar el aviso de licencia (verificado: **ninguna** dependencia Apache-2.0 del árbol trae archivo `NOTICE`, así que no hay nada extra que propagar) |
| `@swc/helpers@0.5.15` | Apache-2.0 | Runtime de SWC (vía Next) |
| `lucide-react@0.511.0` | **ISC** | Iconos. Derivado de Feather Icons (MIT, © Cole Bemis). Solo lo usan `components/ui/checkbox.tsx` y `dropdown-menu.tsx` |
| `tslib@2.8.1` | 0BSD | Sin obligación de atribución (0BSD la elimina) |
| `semver`, `picocolors` | ISC | Transitivas |
| `source-map-js` | BSD-3-Clause | Transitiva |
| `detect-libc`, `baseline-browser-mapping` | Apache-2.0 | Transitivas |
| `sharp@0.34.5` | Apache-2.0 | Solo build (ver §6) |

---

## 6. Dependencias de build/desarrollo

**No se distribuyen al usuario final** (no van en el bundle del navegador ni en el servidor de producción), así que sus obligaciones de atribución no aplican a la app desplegada. Se listan por transparencia:

| Paquete | Licencia | Uso |
|---|---|---|
| `typescript`, `eslint` + plugins, `vitest`, `tailwindcss`, `tailwindcss-animate`, `autoprefixer`, `postcss` | MIT (~310 paquetes) | Toolchain |
| `sharp@0.34.5` | Apache-2.0 | `scripts/generate-icons.mjs`. Su binario `@img/sharp-win32-x64` es **Apache-2.0 AND LGPL-3.0-or-later** (libvips). Solo corre en build; los PNG que produce no son obras derivadas de libvips |
| `caniuse-lite` | **CC-BY-4.0** | Datos de browserslist. Requiere atribución si se redistribuye la base de datos; aquí solo se consulta en build |
| `axe-core`, `lightningcss` | MPL-2.0 | Copyleft **por archivo**: solo aplica si se modifican sus fuentes. Usarlos como herramienta no afecta la licencia de la salida |
| `argparse` | Python-2.0 | Transitiva |
| `language-subtag-registry` | CC0-1.0 | Dominio público |
| `minimatch` | BlueOak-1.0.0 / ISC | Transitiva |

---

## 7. Plantilla y componentes base

- **Next.js `with-supabase` example** — MIT, Copyright © Vercel, Inc. Es el scaffold del que salieron `lib/supabase/*`, el flujo de auth (`app/auth/*`, `components/login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`) y el proxy de sesión.
  <https://github.com/vercel/next.js/tree/canary/examples/with-supabase>
- **shadcn/ui** — MIT, Copyright © shadcn. Los componentes de `components/ui/` (button, card, input, label, badge, checkbox, dropdown-menu) se copiaron desde ahí y luego se restilizaron para el tema vintage. shadcn/ui está diseñado para copiarse al repo; la licencia MIT igual pide conservar el aviso.
  <https://github.com/shadcn-ui/ui>
- **Tailwind CSS** — MIT, Copyright © Tailwind Labs, Inc.

---

## 8. Fuentes de datos: APIs de Lichess y Chess.com

Zephyriov **no incluye ni redistribuye** bases de datos de partidas: consulta las APIs públicas en tiempo real, agrega los resultados y guarda únicamente **el conteo de partidas por apertura** del propio usuario. No se almacenan partidas, PGNs ni datos de terceros.

### Lichess

- **Endpoint**: `GET https://lichess.org/api/games/user/{u}?max=300&opening=true&perfType=blitz,rapid,classical` (público, sin token).
- **Uso permitido**: los [Terms of Service](https://lichess.org/terms-of-service) son explícitos — *"You can use our services for your own personal or commercial use, such as in your own applications, projects, research, or products."* Uso comercial incluido.
- **Sobre la AGPL**: el software de Lichess (**lila**) y el repo de la API son **AGPL-3.0-or-later**. Esto **no** afecta a Zephyriov: no incorporamos ni modificamos código de Lichess, solo hacemos peticiones HTTP a su servidor. La AGPL se dispara al *usar/modificar su código* y ofrecerlo en red, no al consumir su API como cliente. Si algún día se copiara código de lila (o se auto-hospedara), Zephyriov tendría que volverse AGPL — **eso sí sería incompatible con MIT/BSL**.
- Los ToS advierten que *"various parts of the website and services use different licenses"* y que la debida diligencia es responsabilidad de quien integra.
- **Base de datos de partidas** ([database.lichess.org](https://database.lichess.org)): CC0 / dominio público. **No la usamos**, pero queda anotada por si se agrega análisis masivo.
- **Etiqueta**: sé gentil con los rate limits; Lichess es una organización sin fines de lucro. Aunque no lo exigen, también les mandamos el `User-Agent` identificando la app.

Atribución recomendada (no exigida por los ToS, pero correcta):

> Game data provided by Lichess.org (https://lichess.org) — free/libre open source chess server.

### Chess.com

- **Endpoints**: `GET https://api.chess.com/pub/player/{u}/games/archives` y los archivos mensuales que devuelve (públicos, sin token). Es la **Published-Data API**, de solo lectura.
- **Rate limits**: el acceso **serial** es ilimitado — *"If you always wait to receive the response to your previous request before making your next request, then you should never encounter rate limiting."* Las peticiones **en paralelo** pueden recibir `429 Too Many Requests`. `lib/external/chesscom.ts` pide los archivos mensuales **en serie** (bucle `for` con `await`), lo cual cumple la recomendación.
- **Propiedad intelectual**: Chess.com exige respetar su IP — *"board color palettes, piece designs, sound effects, move classification glyphs, and the other features recognized as Chess.com products."* Zephyriov **no usa nada de eso**: la paleta del tablero es propia (crema/teal) y las piezas son de Cburnett (§2). Si algún día se copiaran sus diseños de piezas o su paleta, se estaría cruzando esa línea.
- **Atribución**: solo la exigen explícitamente para el *Daily Puzzle* (que no usamos). Para datos de partidas no piden atribución formal.
- **User-Agent**: recomiendan (no exigen) mandar un `User-Agent` con información de contacto — *"if you supply a recognizable user-agent that contains contact information, then if we must block your application we will attempt to contact you to correct the problem."* **Implementado** en [lib/external/user-agent.ts](lib/external/user-agent.ts): se manda `Zephyriov (+<APP_CONTACT>)`. El contacto sale de la variable de entorno `APP_CONTACT` para no hardcodear datos personales en un repo público; **si no se define, el agente identifica la app pero sin contacto**, y Chess.com no tendría a quién avisar antes de bloquearla.
- Ante dudas de uso comercial, su documentación remite a `legal@chess.com`.

Fuente de ambos términos: [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api).

---

## 9. Contenido del catálogo de aperturas

`scripts/catalog/*.mjs` → `supabase/seed.sql`: 16 aperturas × 6 líneas × ~10 jugadas, con explicación por media-jugada.

- **Las jugadas en sí (secuencias SAN, nombres de aperturas, códigos ECO) no son objeto de copyright**: son hechos e ideas, no expresión creativa. La teoría de aperturas es de dominio público; lo protegible sería la *redacción* de un libro concreto, no la línea.
- **Las explicaciones son originales de este proyecto**: se escribieron para Zephyriov, no se copiaron de ningún libro, curso ni base de datos. Quedan cubiertas por la licencia MIT del repo.
- **Nota de honestidad**: las explicaciones fueron **generadas con asistencia de IA** (Claude) durante la construcción inicial y luego validadas mecánicamente con chess.js (legalidad y SAN canónico). En algunas jurisdicciones —notablemente EE. UU.— el contenido puramente generado por IA **puede no ser elegible para protección de copyright**. Esto no genera ningún riesgo de infracción hacia terceros; solo significa que la protección sobre *ese texto en particular* podría ser más débil de lo que sugiere el encabezado MIT. Relevante si el catálogo llegara a ser el activo diferenciador bajo BSL.
- Si en el futuro se importa teoría desde una fuente externa (libro, curso, base de datos de un motor), **hay que revisar su licencia antes** y anotarla aquí.
- Desde 2026-07-17, las aperturas nuevas o revisadas deben seguir la [metodología de curaduría basada en teoría real](README.md#metodología-de-curaduría-contenido-basado-en-teoría-real) del README (fuente + frecuencia real + trazabilidad por línea) — las líneas rank 1–4 originales quedan pendientes de auditar contra ese estándar.
- **Contenido 2026-07-17** (ranks 5–6 y las aperturas Hyper-Accelerated Dragon y King's Gambit): las **secuencias de jugadas** (hechos, no expresión — ver arriba) se cotejaron contra **Wikibooks "Chess Opening Theory"** (CC BY-SA 4.0; en.wikibooks.org/wiki/Chess_Opening_Theory) y teoría estándar publicada. **No se copió prosa** de Wikibooks ni de ninguna otra fuente: todas las explicaciones son redacción original de este proyecto (con la misma nota de asistencia de IA del punto anterior), así que el CC BY-SA no alcanza a este repo.

---

## 10. Inspiración de diseño

El tema visual se inspiró en referencias que el autor aportó: un UI kit retro estilo *soda-fountain* (rojo/teal/crema) y portadas constructivistas soviéticas de ajedrez de los años 20 (ej. Г. Баронов, *Воспитательное значение шахматной игры*, 1924).

- **No se copió ningún asset**: ni imágenes, ni iconos, ni logotipos, ni archivos de esos materiales. Todo el CSS, los SVG (`streak-seal.tsx`, `star-divider.tsx`) y la paleta se escribieron desde cero.
- **El estilo visual no es objeto de copyright** — sí lo son las obras concretas. Tomar influencia de una estética (paletas, sombras duras, tipografía slab) es legítimo; reproducir una obra no.
- Las marcas que aparecían en el material de referencia (p. ej. Coca-Cola) son **marcas registradas de sus titulares** y **no se usan** en ninguna parte de Zephyriov.
- La obra de 1924 citada arriba está en dominio público en la mayoría de jurisdicciones por antigüedad, pero de todos modos **no se reproduce** ninguna parte de ella.

---

## 11. Notas para un cambio a BSL

> La estrategia completa (parámetros de la BSL, política de contribuciones, checklist de comercialización) vive en **[LICENSING.md](LICENSING.md)**. Aquí solo queda lo que se deriva de **este** inventario de terceros.

**No hay bloqueadores por parte de las dependencias**: ninguna de las que se distribuyen es copyleft fuerte. MIT, BSD-2, BSD-3, ISC, 0BSD y Apache-2.0 **permiten** relicenciar el trabajo derivado (incluso como propietario) siempre que se conserven sus avisos. La OFL permite empaquetar las fuentes dentro de un producto comercial. Los paquetes MPL-2.0 (`axe-core`, `lightningcss`) son dev-only y su copyleft es por archivo — no aplica.

Lo que hay que cuidar, todo originado en este documento:

1. **Las piezas**: mantener explícita la elección de **BSD-3-Clause** (§2). Si alguien "simplifica" la nota a CC BY-SA 3.0, el ShareAlike volvería a ser un problema. La opción BSD es lo que hace esto viable.
2. **Conservar este archivo**: bajo BSL, MIT/BSD/OFL siguen obligando a los mismos avisos. `THIRD-PARTY-NOTICES.md` debe viajar con cada distribución (y si el repo se cierra, migrar los avisos a una página `/licenses` en la app).
3. **Nunca incorporar código de lila** (Lichess, AGPL) — ni copiar snippets. Consumir su API está bien; copiar su código forzaría AGPL y mataría la BSL (§8).
4. **Apache-2.0** (`class-variance-authority`, `@swc/helpers`): incluye una concesión de patentes y exige preservar los avisos. Compatible con BSL.
5. **Revisar los ToS de las APIs** para el modelo de negocio concreto: Lichess permite uso comercial explícitamente; Chess.com sugiere escribir a `legal@chess.com` si el caso roza sus límites (§8).
6. **Catálogo**: leer §9 sobre contenido asistido por IA si el catálogo es el activo a proteger.
7. La licencia MIT ya otorgada es **irrevocable** para las versiones publicadas bajo ella; el cambio a BSL solo aplica hacia adelante.

---

## 12. Cómo regenerar este inventario

```bash
# Licencias de lo que se distribuye
pnpm licenses list --prod

# Licencias del toolchain
pnpm licenses list --dev

# Agrupado y legible (lo usado para este documento)
pnpm licenses list --prod --json | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const j=JSON.parse(s);
  for (const [lic, pkgs] of Object.entries(j))
    console.log(lic+' ('+pkgs.length+'): '+pkgs.map(p=>p.name).join(', '));
});"
```

**Al agregar una dependencia**: corre `pnpm licenses list --prod` y confirma que la nueva entrada cae en MIT/BSD/ISC/Apache-2.0/0BSD. Si aparece **GPL, AGPL, LGPL, SSPL o CC BY-SA** en runtime, **detente**: es incompatible con MIT hoy y con BSL mañana. MPL-2.0 es tolerable si no se modifican sus archivos.

**Al agregar assets** (fuentes, iconos, sonidos, sets de piezas): verifica la licencia *antes* de commitear y anótala aquí. Es el punto ciego más común, como demostró el caso de las piezas (§2).
