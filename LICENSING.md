# Estrategia de licencia y comercialización

Estado hoy: **MIT**, un solo autor, uso personal. Este documento existe para que esa decisión **no se cierre sola**: deja listas las bases para migrar a **BSL 1.1** si algún día se comercializa, y anota lo que faltaría para vender — **nada de esto bloquea desplegar la app hoy**.

- Atribuciones de terceros → [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
- Licencia vigente → [LICENSE](LICENSE)

> **No es asesoría legal.** Es un mapa técnico para no pintarse a uno mismo en una esquina. Antes de cobrar dinero, un abogado.

---

## 1. Por qué hoy puedes relicenciar (y qué lo rompería)

Puedes cambiar Zephyriov a BSL, a propietario o a lo que quieras **porque eres el titular único del copyright**. Nadie más tiene derechos sobre el código. Esa es toda la base, y hoy la tienes gratis.

**Lo que la rompe, en orden de probabilidad:**

| Riesgo | Por qué mata la opción BSL | Cómo evitarlo |
|---|---|---|
| **Aceptar un PR externo** | Su autor conserva el copyright de su aporte. Bajo MIT tú puedes *usarlo*, pero **no relicenciarlo a BSL** sin su permiso. Un solo PR mergeado sin acuerdo te obliga a rastrear a esa persona años después — o a reescribir su código | Ver §2 |
| **Copiar código AGPL** (ej. de lila/Lichess) | Forzaría todo el proyecto a AGPL. Incompatible con BSL y con cualquier plan comercial cerrado | Consumir su API está bien; **nunca copiar su código** |
| **Meter una dependencia copyleft** en runtime (GPL/AGPL/SSPL) | Mismo efecto | `pnpm licenses list --prod` antes de commitear |
| **"Simplificar" la nota de las piezas** a CC BY-SA 3.0 | El ShareAlike volvería a aplicar al arte | Mantener explícita la elección **BSD-3-Clause** ([THIRD-PARTY-NOTICES §2](THIRD-PARTY-NOTICES.md#2-arte-de-las-piezas-de-ajedrez-atención)) |

**Lo que NO puedes deshacer**: la licencia MIT ya publicada es **irrevocable para las versiones publicadas bajo ella**. Si alguien clona el repo hoy, ese código sigue siendo MIT para esa persona **para siempre**, y puede forkearlo. Cambiar a BSL solo aplica **hacia adelante**, a las versiones nuevas. Es la razón por la que empresas que hacen este cambio (HashiCorp, Sentry, MariaDB) conviven con forks de la última versión abierta.

Si eso te preocupa a futuro, la decisión real no es "MIT o BSL después", sino **qué publicas mientras tanto**.

## 2. La única base que hay que mantener: contribuciones

Mientras seas el único que commitea, no hay nada que hacer. **En el momento en que aceptes el primer PR**, elige una de estas tres — antes de mergear, no después:

1. **No aceptar PRs** (issues sí). Trivial, cero fricción, cero papeleo. Es lo razonable mientras sea un proyecto personal.
2. **DCO + política de licencia**: declarar en el repo que *"al contribuir, aceptas que tu aporte se licencie bajo los términos del proyecto, presentes y futuros, incluyendo un posible cambio de licencia"*. Ligero, pero su solidez legal es discutible.
3. **CLA** (Contributor License Agreement) que te ceda o te licencie los derechos con permiso de sublicenciar. Es lo que usan los que sí hacen el cambio. Fricción real para contribuidores.

> Si algún día llega un PR que quieres mergear y no tienes nada de esto, la salida es pedirle a esa persona su consentimiento explícito por escrito **antes** del merge. Después es mucho más caro.

Para un proyecto de un solo autor: **opción 1 hasta que haya una razón concreta para cambiar.** No montes un CLA para un repo que solo usas tú.

## 3. Bases ya puestas

Esto ya está hecho y no hay que tocarlo — solo no romperlo:

- ✅ **Titularidad limpia**: un autor, sin contribuciones externas, historial sin secretos (`.env.local` nunca se commiteó).
- ✅ **Cero copyleft en runtime**: todas las dependencias distribuidas son MIT / BSD-2 / BSD-3 / ISC / 0BSD / Apache-2.0. Todas **permiten** relicenciar el derivado, incluso como propietario, conservando sus avisos. Verificado con `pnpm licenses list --prod`.
- ✅ **Arte de las piezas bajo BSD-3-Clause** (opción elegida de la multi-licencia de Cburnett) — sin ShareAlike, apto para uso comercial cerrado.
- ✅ **Fuentes OFL 1.1**: la OFL permite empaquetarlas dentro de un producto comercial; lo único prohibido es venderlas solas.
- ✅ **Lichess permite uso comercial** por ToS explícito, y solo consumimos su API por HTTP (la AGPL de lila no nos toca).
- ✅ **No usamos IP de Chess.com**: paleta propia, piezas de Cburnett, sin sonidos ni glifos suyos.
- ✅ **Inventario reproducible**: [THIRD-PARTY-NOTICES §12](THIRD-PARTY-NOTICES.md#12-cómo-regenerar-este-inventario).

## 4. Cómo migrar a BSL 1.1 (cuando toque)

**Qué es**: la Business Source License permite leer, copiar y modificar el código, pero **restringe el uso en producción** salvo lo que tú autorices, y **se convierte automáticamente en open source** en una fecha que tú fijas. **No es OSI-approved** — no es "open source" en sentido estricto, y conviene no llamarlo así.

**Los 5 parámetros** que hay que rellenar en el encabezado:

| Parámetro | Qué poner en Zephyriov |
|---|---|
| **Licensor** | Tu nombre legal, o **la entidad** si constituyes uno (ver §5.1). Debe coincidir con el titular real del copyright |
| **Licensed Work** | `Zephyriov <versión>` — el cambio aplica por versión, no al repo entero |
| **Additional Use Grant** | El corazón del asunto: qué uso en producción regalas. Ejemplo típico: *"You may use the Licensed Work for non-commercial or personal use"*. Aquí es donde decides que un usuario individual pueda auto-hospedarlo pero un competidor no lo ofrezca como servicio de pago |
| **Change Date** | Cuándo se vuelve open source. **Máximo: el cuarto aniversario** de la primera distribución pública de esa versión bajo BSL. Puedes poner antes, nunca después |
| **Change License** | **Debe ser GPLv2+ o una licencia compatible con GPL.** Buena noticia: **MIT es compatible con GPL**, así que puedes poner MIT y el proyecto "vuelve" a su licencia actual al vencer |

**Restricciones reales** (verificadas contra el [texto oficial](https://mariadb.com/bsl11/) y la [FAQ de adopción](https://mariadb.com/bsl-faq-adopting/)):

- El Change Date **no puede exceder 4 años** desde la primera distribución pública de esa versión.
- El Change License **debe ser GPL-compatible** — no puedes usar la BSL para que el código nunca se libere.
- Puedes especificar Change Licenses adicionales sin límite.

**Pasos concretos el día que se haga:**

1. Copiar el texto canónico de BSL 1.1 **desde la fuente** (<https://mariadb.com/bsl11/>) — no de memoria ni de un blog.
2. Rellenar los 5 parámetros. Redactar el **Additional Use Grant** con abogado: es la cláusula que define tu negocio, y la única que la BSL espera que personalices.
3. Reemplazar [LICENSE](LICENSE) y actualizar `"license"` en `package.json` (a `"SEE LICENSE IN LICENSE"`, ya que BSL no es un identificador SPDX estándar).
4. **Conservar [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) intacto**: MIT, BSD y OFL siguen exigiendo sus avisos bajo BSL. Bajar la BSL no te libera de ellos.
5. Etiquetar la última versión MIT (`git tag v-last-mit`) para que quede claro qué quedó abierto y qué no.
6. Actualizar el README: la app **deja de ser open source**; llamarla así sería incorrecto.

## 5. Qué falta para que sea comerciable

**Nada de esto bloquea subir la app a la web hoy.** Es lo que haría falta el día que cobres dinero o abras registro público.

### 5.1 Legal / identidad

- [ ] **Nombre legal en [LICENSE](LICENSE)** — hoy dice `MoyyyL`. Es lo único pendiente de la licencia actual.
- [ ] **Entidad**: persona física con actividad empresarial o sociedad. Define quién es el *Licensor* de la BSL y quién factura.
- [ ] **Marca "Zephyriov"**: hacer una búsqueda de anterioridad antes de invertir en el nombre; registrarla (en México, IMPI) si el producto crece. El copyright protege el código, **no el nombre**.

### 5.2 Protección de datos (lo más probable que aplique)

Ya se guardan datos personales: correo (Supabase Auth), usernames de Lichess/Chess.com, historial de estudio y zona horaria.

- [ ] **Aviso de Privacidad** — en México lo exige la **LFPDPPP** en cuanto tratas datos personales de terceros; hoy no aplica porque el único titular eres tú, pero aplica **desde el primer usuario ajeno**, cobres o no.
- [ ] **GDPR** si aceptas usuarios en la UE: base legal del tratamiento, derecho de acceso, borrado y portabilidad.
- [ ] **Borrado de cuenta y exportación de datos** en la app. Hoy no existen: `on delete cascade` está en el schema, pero no hay UI ni endpoint para que un usuario se borre. Es requisito de GDPR (art. 17/20) y de los derechos ARCO en México.
- [ ] **Declarar sub-procesadores** en el aviso: Supabase (datos + auth), Vercel (hosting), Lichess y Chess.com (a quienes se envía el username del usuario).
- [ ] **Cookies**: las de sesión de Supabase son técnicamente necesarias y suelen estar exentas de consentimiento. Si algún día se añade analítica, ahí sí hace falta banner.

### 5.3 Terceros

- [ ] **Chess.com**: su documentación remite a `legal@chess.com` ante dudas. **Un producto de pago construido sobre datos de sus usuarios amerita esa consulta** — es la conversación que yo tendría antes de cobrar.
- [ ] **Lichess**: ya permite uso comercial explícitamente. Nada que hacer, pero considera donar si el negocio se apoya en su API gratuita.
- [ ] **Supabase / Vercel**: los planes gratuitos no son para producción comercial. Requiere plan de pago y, para GDPR, firmar su DPA.

### 5.4 Producto

- [ ] **Página `/licenses` en la app**: MIT y BSD piden que sus avisos acompañen a "todas las copias", y el bundle JS que sirves al navegador es una copia. Hoy lo cubre [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) en el repo — práctica generalizada y suficiente mientras sea open source. Bajo BSL (repo posiblemente cerrado), esa cobertura desaparece y la página in-app pasa a ser la forma correcta de cumplir.
- [ ] **Términos de servicio**: límites de responsabilidad, qué pasa si Lichess/Chess.com caen, política de reembolso.
- [ ] **Catálogo**: si es el activo diferenciador, leer [THIRD-PARTY-NOTICES §9](THIRD-PARTY-NOTICES.md#9-contenido-del-catálogo-de-aperturas) sobre contenido asistido por IA. Contenido escrito o revisado por un humano tiene una posición de copyright más sólida.
- [ ] **Pagos**: Stripe/Paddle traen su propio cumplimiento (facturación, impuestos, PCI). Paddle actúa como *merchant of record* y absorbe buena parte de eso.

### 5.5 Higiene técnica (ya verificada, mantener)

- [x] `.env.local` fuera del historial de git — **verificado**: nunca se commiteó.
- [x] La llave `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` es pública por diseño; lo que protege los datos es el **RLS**, no el secreto de la llave.
- [ ] **`SECURITY.md`**: dónde reportar vulnerabilidades en privado. Recomendable desde el primer usuario externo, dado que es una app con auth.
- [ ] **Rotar llaves** si el proyecto de Supabase de desarrollo se reutiliza en producción. Lo correcto es un proyecto Supabase separado para prod.

---

## Resumen en una línea

Hoy no falta nada para desplegar. Para la opción BSL, la única base viva que hay que cuidar es **no mergear PRs externos sin acuerdo previo**; todo lo demás ya está puesto. Para comerciar, lo primero es el **Aviso de Privacidad + borrado de cuenta**, y lo segundo, **hablar con `legal@chess.com`**.
