// ============================================================================
// sync-master.mjs — Sincroniza los archivos maestro (repo jarvis-mail-system) → assets
// ----------------------------------------------------------------------------
// 1. Toma el maestro con placeholders y le inyecta, por reemplazo literal, el
//    contenido de NN-foundations/global-styles/ (head-meta-tags.html y
//    global-styles.html) en sus dos puntos de inserción — así el <head> real
//    vive en un solo lugar (NN-foundations) en vez de estar hardcodeado
//    dentro del maestro.
// 2. Copia NN-components/footer/*.html → src/assets/templates/ tal cual.
// 2b. Copia NN-components/headers/**/*.html (las 10 marcas × 4 archivos +
//    el wrapper _header-wrapper.html) → src/assets/templates/headers/,
//    preservando la subcarpeta de marca — ver src/components/header/render.ts,
//    que las carga vía import.meta.glob.
// 3. Copia head-meta-tags.html SUELTO a src/assets/templates/ (además de
//    inyectarlo en el maestro): la app parsea de ahí la lista de temas y el
//    `color_footer_mail_general` de cada uno — ver src/themes/themes.ts. Así
//    los temas siguen viviendo SOLO en el repo (Regla de oro #4), y si David
//    agrega un tema nuevo la app lo levanta sin tocar código.
// 3b. Copia NN-components/banners/big-banner-{horizontal,vertical}.html + 19
//    de los 23 archivos de banners/banner_moleculas/ → src/assets/templates/banners/,
//    preservando la subcarpeta — ver src/components/banner/shell.ts (que
//    parsea los 2 shells) y src/components/banner/items/render.ts (que carga
//    las 19 piezas vía import.meta.glob). Los 4 archivos excluidos a
//    propósito (2 duplicados byte a byte, 2 que son solo un content-block de
//    CTA) están documentados junto a BANNER_MOLECULA_FILES más abajo.
//    molecula_separadores.html y molecula_texto_pastilla.html (los 2 que hasta
//    la fase 1 del plan de nuevos módulos de contenido quedaban sin decisión,
//    ver [[project_body_modules_plan_2026-08-26]]) ya se sincronizan: la app
//    los usa como las piezas SEPARADOR y TEXTO_PASTILLA del banner.
// 3c. Copia NN-components/NN_content-modules/deals/deal_columnas.html →
//    src/assets/templates/deals/ — ver src/components/deals/render.ts, que lo
//    carga y arma con él los pares de tarjetas de deal. Los 2 archivos
//    hermanos (deal-large.backup.html / deal-small.backup.html) quedan fuera a
//    propósito: 02-components/README.md los declara retirados ("ya no se usan
//    en el sistema... no están enlazados desde ningún template") y además
//    modelan otra cosa (un deal único de motor de recomendación, con variables
//    smalldeal_*/deal_recommendation_* y legales por país), no el par de
//    tarjetas de copy manual que implementa la app.
// 3d. Copia NN-components/NN_content-modules/content_moleculas/molecula_franja_logos.html
//    → src/assets/templates/content-modules/content_moleculas/ — ver
//    src/components/banner/items/render.ts, FRANJA_LOGOS: es una "molécula
//    compartida" banner+body (pedido explícito del usuario, ver la sección B
//    del plan de fase 1), así que su primer consumidor real es una pieza de
//    banner, aunque el archivo maestro viva en content-modules/. Los otros 15
//    archivos de esa carpeta quedan LISTADOS (para no disparar el warning de
//    "archivo nuevo sin sincronizar") pero SIN COPIAR — son la materia prima
//    de los módulos de body de fases futuras del mismo plan.
// 4. VALIDA el contrato antes de escribir nada:
//    - Los marcadores `<!-- FOOTER -->` y `<!-- CIERRES -->` (los slots
//      simples ya implementados) deben aparecer EXACTAMENTE una vez cada uno
//      en el maestro. Ojo: el de Cierre es PLURAL en el maestro
//      ("CIERRES", no "CIERRE") — inconsistencia real del repo, no un typo de
//      acá; debe quedar sincronizado con SLOT_MARKER_TEXT de
//      src/template/assemble.ts.
//    - Los placeholders de HEADER, CONTENIDOS y BANNER son distintos (HEADER y
//      CONTENIDOS viven como comentarios multilínea — "HEADER WRAPPER …
//      CIERRE HEADER WRAPPER" y "WRAPPER DE CONTENIDOS: …"; BANNER es una
//      sola línea pero con texto libre tras "BANNER :" que el repo reescribe
//      seguido, así que se matchea el prefijo, no la frase completa — ver
//      BANNER_PLACEHOLDER_RE) y se validan aparte, con el mismo regex que usa
//      src/template/assemble.ts para reemplazarlos.
//    - Los 2 archivos de banner (`big-banner-*.html`) deben traer el ancla
//      "MODULO MOLECULAS" exactamente 1 vez y el token de relleno manual
//      "AQUIELLINKDELBANNER" exactamente 2 veces (href + originalsrc) —
//      src/components/banner/shell.ts depende de esas anclas para extraer el
//      punto de inserción de las piezas del banner sin tocar el archivo real.
//      `modulo_tags_{horizontal,vertical}.html` deben traer exactamente 3
//      pills de tag (el archivo real trae 3 hardcodeadas; la app las vuelve
//      1-3 editables). Los 2 `molecula_cta_interno_*` (no sincronizados, ver
//      arriba) se validan igual: si el repo les cambia el `cta_alineado`
//      fijo, el hardcode de items/render.ts (CTA_INTERNO) queda desactualizado
//      en silencio si no se aborta acá.
//    - deal_columnas.html debe traer cada una de sus ~25 anclas la cantidad
//      exacta de veces que espera src/components/deals/render.ts (ver
//      DEALS_ANCHOR_COUNTS). A diferencia del banner, el maestro NO marca las
//      piezas opcionales del deal con `{% if %}`: solo las describe en
//      comentarios ("si no hay texto se elimina la etiqueta completa"), así que
//      el render las ubica por literal y las corta. Si el maestro renombra un
//      `role="..."`, cambia un texto de ejemplo o duplica una celda, el render
//      cortaría el elemento equivocado en silencio — por eso se cuenta acá.
//    - El placeholder de global-styles.html debe aparecer AL MENOS una vez (no
//      exactamente una: estructura_general.html duplicó por accidente el de
//      global-styles.html — aparece una vez, correcto, en el <head>, y una
//      segunda vez suelto dentro del <td> del header wrapper. String.replace()
//      sin flag global solo toca la primera —la del <head>—, así que la
//      segunda queda como comentario HTML inerte en el export: ruido
//      cosmético, no una rotura funcional. Como es un typo del repo y no
//      podemos tocarlo, se tolera en vez de bloquear el sync).
//    - El placeholder de head-meta-tags.html, en cambio, ya NO se exige (pull
//      2026-08-21, bd9f4a5): el repo borró de estructura_general.html todo el
//      bloque de apertura que lo traía (junto con los `{% assign %}` de
//      EJEMPLO que lo precedían, ver más abajo) — accidente de limpieza, no
//      rediseño (el CHANGELOG de ese pull no lo menciona). Verificado que no
//      hace falta para nada: los valores de tema que de verdad usa la app
//      salen de la copia SUELTA de head-meta-tags.html (src/themes/themes.ts,
//      independiente de si se inyecta acá), y el bloque de temas que SÍ se
//      inyectaba quedaba de todos modos completamente borrado por
//      stripThemeDefinitions (themes/inlineTheme.ts) antes de exportar — así
//      que perder la inyección no cambia ni un byte del HTML final. Si el
//      placeholder no aparece, solo se avisa por consola y esa inyección en
//      particular se salta (ver el loop de más abajo).
//    - El `{% assign tema_general_mail_general = '...' %}` de
//      estructura_general.html YA NO se exige tampoco, por el mismo accidente
//      de limpieza de arriba: era una copia redundante de la misma línea que
//      ya trae head-meta-tags.html (que sigue intacta ahí). No es una anchor
//      funcional real — inlineTheme.ts la borra si está, tolera si no
//      (`.replace()` sobre 0 matches es un no-op) — así que perderla del todo
//      solo se avisa, no aborta.
//    - head-meta-tags.html debe declarar al menos un tema. Antes también se
//      exigía que cada tema definiera `color_footer_mail_general` (de ahí
//      salía el font_style_look del footer), pero el repo lo borró de las 11
//      ramas en la reestructuración de headers/banners a moléculas (sin
//      reemplazo, y sin que ningún doc lo mencione — parece un accidente de
//      edición, no un cambio de diseño: 02-components/README.md,
//      GUIA-DE-TEMAS.md, COMO-ARMAR-UN-MAIL.md y CHANGELOG.md siguen
//      describiéndolo como el mecanismo vigente). Bloquear el sync por esto
//      dejaría a la app sin poder levantar NINGÚN cambio del repo (incluida
//      esta misma reestructuración) hasta que se corrija upstream, así que
//      se avisa por consola pero no se aborta — themes.ts trae su propio
//      fallback (por grupo de tema: 'pro' en Pro/ProBlack, 'negro' en el
//      resto) que reproduce el valor documentado mientras la variable no
//      vuelva a existir en el repo.
//    Si algo falla → aborta SIN escribir nada, y la app conserva la última
//    copia buena de los assets.
//
// NOTA: el repo jarvis-mail-system es solo contenido (fuente de verdad de
// diseño), este script solo LEE de él — nunca escribe ni modifica nada ahí.
//
// Las carpetas se resuelven por NOMBRE, ignorando el prefijo numérico: el repo
// renumera seguido (los ejemplos fueron 08- → 07- → 06- y los componentes
// 03- → 02- en un mismo día), y hardcodear el número rompía el sync en cada
// renumeración. Ver resolveNumberedDir(). Lo mismo pasa un nivel más adentro,
// con las subcarpetas de NN-components/ (footer/ → 06_footer/, headers/ →
// 01_headers/, closing/ → 05_closing/, etc., todas con el separador '_' en
// vez de '-') — ver resolveNumberedSubdir().
//
// Uso: node scripts/sync-master.mjs   (corre solo con `npm run dev/build`)
// ============================================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(SCRIPT_DIR, '..')
const MASTER_DIR = path.resolve(APP_DIR, '..')
const ASSETS_DIR = path.join(APP_DIR, 'src', 'assets', 'templates')

const RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m', RESET = '\x1b[0m'
const errors = []
const fail = (msg) => errors.push(msg)

/**
 * Devuelve el nombre de la carpeta `NN-<suffix>` del repo (ej. 'foundations' →
 * '01-foundations'), o null si no hay exactamente una.
 *
 * Si hay varias falla en vez de adivinar: eso pasó de verdad cuando el repo
 * tuvo 07-examples/ y 08-examples/ a la vez con contenidos distintos, y elegir
 * el equivocado habría generado mails con el maestro viejo sin avisar.
 */
function resolveNumberedDir(suffix) {
  let entries = []
  try {
    entries = fs.readdirSync(MASTER_DIR, { withFileTypes: true })
  } catch (e) {
    fail(`No se pudo leer ${MASTER_DIR}: ${e.message}`)
    return null
  }
  const re = new RegExp(`^\\d+-${suffix}$`)
  const matches = entries.filter((e) => e.isDirectory() && re.test(e.name)).map((e) => e.name)

  if (matches.length === 0) {
    fail(`No se encontró ninguna carpeta NN-${suffix}/ en ${MASTER_DIR}`)
    return null
  }
  if (matches.length > 1) {
    fail(`Hay ${matches.length} carpetas NN-${suffix}/ (${matches.join(', ')}) — ambiguo, se esperaba 1`)
    return null
  }
  return matches[0]
}

/**
 * Como resolveNumberedDir, pero para una subcarpeta `NN_<suffix>` (separador
 * '_', no '-') dentro de una carpeta padre ya resuelta — ej.
 * '02-components/06_footer'. Mismo criterio: si hay 0 o más de 1, falla en
 * vez de adivinar.
 */
function resolveNumberedSubdir(parentDir, parentLabel, suffix) {
  if (!parentDir) return null
  let entries = []
  try {
    entries = fs.readdirSync(parentDir, { withFileTypes: true })
  } catch (e) {
    fail(`No se pudo leer ${parentDir}: ${e.message}`)
    return null
  }
  const re = new RegExp(`^\\d+_${suffix}$`)
  const matches = entries.filter((e) => e.isDirectory() && re.test(e.name)).map((e) => e.name)

  if (matches.length === 0) {
    fail(`No se encontró ninguna carpeta NN_${suffix}/ dentro de ${parentLabel}/`)
    return null
  }
  if (matches.length > 1) {
    fail(`Hay ${matches.length} carpetas NN_${suffix}/ (${matches.join(', ')}) dentro de ${parentLabel}/ — ambiguo, se esperaba 1`)
    return null
  }
  return matches[0]
}

const FOUNDATIONS_DIR_NAME = resolveNumberedDir('foundations')
const COMPONENTS_DIR_NAME = resolveNumberedDir('components')
const EXAMPLES_DIR_NAME = resolveNumberedDir('examples')
const COMPONENTS_DIR = COMPONENTS_DIR_NAME && path.join(MASTER_DIR, COMPONENTS_DIR_NAME)

const FOOTER_SUBDIR_NAME = resolveNumberedSubdir(COMPONENTS_DIR, COMPONENTS_DIR_NAME, 'footer')
const HEADERS_SUBDIR_NAME = resolveNumberedSubdir(COMPONENTS_DIR, COMPONENTS_DIR_NAME, 'headers')
const CIERRE_SUBDIR_NAME = resolveNumberedSubdir(COMPONENTS_DIR, COMPONENTS_DIR_NAME, 'closing')
const CTAS_SUBDIR_NAME = resolveNumberedSubdir(COMPONENTS_DIR, COMPONENTS_DIR_NAME, 'ctas')
const BANNERS_SUBDIR_NAME = resolveNumberedSubdir(COMPONENTS_DIR, COMPONENTS_DIR_NAME, 'banners')
const CONTENT_MODULES_SUBDIR_NAME = resolveNumberedSubdir(COMPONENTS_DIR, COMPONENTS_DIR_NAME, 'content-modules')

const FOUNDATIONS_DIR = FOUNDATIONS_DIR_NAME && path.join(MASTER_DIR, FOUNDATIONS_DIR_NAME, 'global-styles')
const FOOTER_DIR = FOOTER_SUBDIR_NAME && path.join(COMPONENTS_DIR, FOOTER_SUBDIR_NAME)
const HEADERS_DIR = HEADERS_SUBDIR_NAME && path.join(COMPONENTS_DIR, HEADERS_SUBDIR_NAME)
const CIERRE_DIR = CIERRE_SUBDIR_NAME && path.join(COMPONENTS_DIR, CIERRE_SUBDIR_NAME)
const CTAS_DIR = CTAS_SUBDIR_NAME && path.join(COMPONENTS_DIR, CTAS_SUBDIR_NAME)
const BANNERS_DIR = BANNERS_SUBDIR_NAME && path.join(COMPONENTS_DIR, BANNERS_SUBDIR_NAME)
/** `banner_moleculas/` no lleva prefijo numérico (no es un NN_algo) — nombre fijo. */
const BANNER_MOLECULAS_DIR_NAME = 'banner_moleculas'
const BANNER_MOLECULAS_DIR = BANNERS_DIR && path.join(BANNERS_DIR, BANNER_MOLECULAS_DIR_NAME)
const CONTENT_MODULES_DIR = CONTENT_MODULES_SUBDIR_NAME && path.join(COMPONENTS_DIR, CONTENT_MODULES_SUBDIR_NAME)
/** `deals/` tampoco lleva prefijo numérico dentro de NN_content-modules/ — nombre fijo. */
const DEALS_DIR_NAME = 'deals'
const DEALS_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, DEALS_DIR_NAME)
/** `content_moleculas/` tampoco lleva prefijo numérico — nombre fijo (mismo
 *  criterio que banner_moleculas/ y deals/). */
const CONTENT_MOLECULAS_DIR_NAME = 'content_moleculas'
const CONTENT_MOLECULAS_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, CONTENT_MOLECULAS_DIR_NAME)
/** `title/` tampoco lleva prefijo numérico — nombre fijo, mismo criterio.
 *  Fase 2 del plan de nuevos módulos de contenido — ver
 *  src/components/title/render.ts. */
const TITLE_DIR_NAME = 'title'
const TITLE_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, TITLE_DIR_NAME)
const TITLE_FILE = 'modulo-titulo.html'
/** `bullet/`/`benefits/` — mismo criterio que `title/`, fase 3 del plan de
 *  nuevos módulos de contenido. Los nombres de carpeta son los del maestro
 *  (inglés, aunque el contenido/archivo sea español, mismo patrón que title/). */
const BULLET_DIR_NAME = 'bullet'
const BULLET_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, BULLET_DIR_NAME)
const BULLET_FILE = 'modulo_bullet.html'
const BENEFITS_DIR_NAME = 'benefits'
const BENEFITS_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, BENEFITS_DIR_NAME)
const BENEFITS_FILE = 'modulo-beneficios.html'
/** `1columna/` — fase 4 del plan de nuevos módulos de contenido, ver
 *  components/col1/render.ts. Nombre de carpeta calcado del maestro (dígito
 *  inicial incluido — es solo un segmento de ruta, no un identificador JS). */
const COL1_DIR_NAME = '1columna'
const COL1_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, COL1_DIR_NAME)
const COL1_FILE = 'modulo-1columna.html'
/** `3columnas/` — mismo criterio que `1columna/`, fase 5 del plan de nuevos
 *  módulos de contenido, ver components/col3/render.ts. */
const COL3_DIR_NAME = '3columnas'
const COL3_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, COL3_DIR_NAME)
const COL3_FILE = 'modulo-3-columnas.html'
/** `2columnas/` — mismo criterio, fase 6 del plan de nuevos módulos de
 *  contenido, ver components/col2/render.ts. */
const COL2_DIR_NAME = '2columnas'
const COL2_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, COL2_DIR_NAME)
const COL2_FILE = 'modulo-2-columnas.html'
/** `logos/` — fase 7 del plan de nuevos módulos de contenido, ver
 *  components/logos/render.ts. 4 archivos (el shell + 3 grillas
 *  alternativas), a diferencia de los módulos anteriores que traen uno solo. */
const LOGOS_DIR_NAME = 'logos'
const LOGOS_DIR = CONTENT_MODULES_DIR && path.join(CONTENT_MODULES_DIR, LOGOS_DIR_NAME)
const LOGOS_MODULE_FILE = 'modulo-logos.html'
const LOGOS_GRID_FILES = ['grilla3logos.html', 'grilla4logos.html', 'grilla6logos.html']
/** Vive directo en la raíz de NN_content-modules/, sin subcarpeta propia (a
 *  diferencia de title/bullet/benefits) — nombre fijo. Pedido explícito del
 *  usuario 2026-08-31: Título/Bullet/CTA/Deals/Beneficios y Cierre deben vivir
 *  todos dentro de ESTA tabla (ver components/contenidos/render.ts), no en
 *  tablas hermanas independientes como hasta ahora. */
const CONTENIDOS_WRAPPER_FILE = '_contenidos_wrapper.html'

/**
 * FOOTER y CIERRE: ver la nota de arriba sobre por qué CONTENIDOS queda
 * afuera. `text` es el texto real del marcador en el maestro — el de CIERRE
 * es plural ("CIERRES"), no el nombre del slot. BANNER se valida aparte, más
 * abajo (BANNER_PLACEHOLDER_RE) — su marcador es un comentario de instrucción
 * en prosa, no un `<!-- BANNER -->` de una sola palabra.
 */
const SLOT_MARKERS = [
  { slot: 'FOOTER', text: 'FOOTER' },
  { slot: 'CIERRE', text: 'CIERRES' },
]

const TEMPLATE_BASE_NAME = 'estructura_general.html'
/** Ruta relativa al repo, solo para los mensajes. */
const TEMPLATE_BASE_SOURCE = path.join(EXAMPLES_DIR_NAME ?? 'NN-examples', TEMPLATE_BASE_NAME)
const TEMPLATE_BASE_FILE = 'template_base.html'
const FOOTER_FILES = ['footer.html', 'footer_general.html', 'footer_rts.html', 'footer_sinamor.html']
const CIERRE_FILE = 'cierre.html'
/**
 * Solo cta-template.html: es el content block real que src/preview/liquidPreview.ts
 * infla donde aparezca `{{content_blocks.${CTA-template}}}`. cta-llamado.html
 * (el patrón de instanciación) no se sincroniza — nadie lo importa, la app
 * escribe su propio renderCtaSnippet inspirado en su forma, igual que ya pasa
 * con footer.html (sincronizado pero sin uso en runtime).
 */
const CTA_FILE = 'cta-template.html'

/** Debe quedar sincronizado con WRAPPER_DE_CONTENIDOS_PLACEHOLDER_RE de src/template/assemble.ts. */
const CONTENIDOS_WRAPPER_PLACEHOLDER_RE = /<!--\s*WRAPPER DE CONTENIDOS[\s\S]*?-->/g

/** Debe quedar sincronizado con BANNER_PLACEHOLDER_RE de src/template/assemble.ts.
 *  Prefijo, no la frase completa: el texto tras "BANNER :" cambia seguido en
 *  el repo. Exigir que "BANNER" vaya pegado a `<!--` y seguido de `:` excluye
 *  las otras 2 apariciones de la palabra en el maestro ("EJEMPLO DE DEFINICION
 *  DE CAMPOS PARA BANNER", "INICIO SECCION BANNER") — verificado. */
const BANNER_PLACEHOLDER_RE = /<!--\s*BANNER\s*:[\s\S]*?-->/g

const BANNER_FILES = ['big-banner-horizontal.html', 'big-banner-vertical.html']

/**
 * Las 19 piezas que la app importa de banner_moleculas/ (23 archivos reales).
 * Quedan FUERA a propósito 4 de los 23:
 *  - molecula_texto_M_horizontal.html / _vertical.html: duplicados byte a
 *    byte de molecula_textom_*, marcados como "posible duplicado sin
 *    resolver" en 05-docs/INDICE-DE-COMPONENTES.md. Sincronizar los 2 pares
 *    invitaría a usar el equivocado.
 *  - molecula_cta_interno_horizontal.html / _vertical.html: son solo los
 *    {% assign %} + la referencia al content block CTA-template, exactamente
 *    lo que emite src/components/cta/render.ts. No se copian (mismo criterio
 *    que cta-llamado.html) pero SÍ se validan más abajo.
 *
 * `modulo_texto_complementario.html` (archivo único, compartido entre
 * orientaciones, con un `<h4 style="color: #FFFFFF;">` hardcodeado) fue
 * REEMPLAZADO upstream por este par — el pull que trajo este cambio también
 * lo promovió de "modulo" a "molecula" (ver 06-examples/template_maestro_original.html).
 * Nuevo contenido real: `<h2 style="color: {{color_texto_mail_general}} ">`,
 * ya no hardcodeado — ver components/banner/items/render.ts.
 *
 * molecula_separadores.html (pieza SEPARADOR) y molecula_texto_pastilla.html
 * (pieza TEXTO_PASTILLA) se sumaron en la fase 1 del plan de nuevos módulos de
 * contenido (ver [[project_body_modules_plan_2026-08-26]]) — hasta entonces
 * quedaban sin sincronizar (ver el warning de "archivo nuevo" de más abajo,
 * que hasta esa fase los señalaba en cada corrida).
 */
const BANNER_MOLECULA_FILES = [
  'molecula_promo_horizontal.html',
  'molecula_promo_vertical.html',
  'molecula_creditos_horizontal.html',
  'molecula_creditos_vertical.html',
  'molecula_textoxl_horizontal.html',
  'molecula_textoxl_vertical.html',
  'molecula_textom_horizontal.html',
  'molecula_textom_vertical.html',
  'molecula_texto_complementario_horizontal.html',
  'molecula_texto_complementario_vertical.html',
  'molecula_img_automatica_horizontal.html',
  'molecula_img_automatica_vertical.html',
  'modulo_img_altofijo_horizontal.html',
  'modulo_img_altofijo_vertical.html',
  'modulo_img_automatica_horizontal.html',
  'modulo_tags_horizontal.html',
  'modulo_tags_vertical.html',
  'molecula_separadores.html',
  'molecula_texto_pastilla.html',
]

/** No se copian, solo se validan: si el maestro cambia el cta_alineado fijo
 *  de estos 2 archivos, el hardcode de components/banner/items/render.ts
 *  queda desactualizado en silencio si no se aborta acá. */
const CTA_INTERNO_FIXED_ALIGN = {
  'molecula_cta_interno_horizontal.html': "{% assign cta_alineado = 'left' %}",
  'molecula_cta_interno_vertical.html': "{% assign cta_alineado = 'center' %}",
}

/** Archivos de banner_moleculas/ que existen pero no se sincronizan ni se
 *  validan por nombre fijo (duplicados o content-block puro, ver arriba). */
const BANNER_MOLECULA_KNOWN_EXTRA_FILES = [
  'molecula_texto_M_horizontal.html',
  'molecula_texto_M_vertical.html',
  ...Object.keys(CTA_INTERNO_FIXED_ALIGN),
]

/** Ancla que src/components/banner/shell.ts necesita en cada big-banner —
 *  aparece exactamente 1 vez en cada archivo (verificado). */
const BANNER_MOLECULAS_ANCHOR = '<!-- MODULO MOLECULAS'
/** Token de relleno manual (no es Liquid) que aparece 2 veces por archivo
 *  (href + originalsrc), igual convención que AQUIELLINK# del CTA. */
const BANNER_LINK_PLACEHOLDER = 'AQUIELLINKDELBANNER'
/** Discriminador de un pill de tag — se cuenta como texto simple (no con el
 *  regex real de la app) para que este script no dependa de src/. */
const TAG_PILL_DISCRIMINATOR = '> tag 1 </h4>'

/** Los 3 `<div>` de tamaño fijo que components/banner/items/render.ts (pieza
 *  SEPARADOR) recorta literalmente de molecula_separadores.html — cada uno
 *  debe aparecer EXACTAMENTE 1 vez (verificado). */
const SEPARADOR_DIV_LITERALS = ['<div class="separador"></div>', '<div class="separador-M"></div>', '<div class="separador-S"></div>']

/** molecula_texto_pastilla.html (pieza TEXTO_PASTILLA): 2 tablas alternas
 *  (pastilla a la derecha / a la izquierda) — components/banner/items/render.ts
 *  elige UNA según `pillPosition` y sustituye estos 2 textos literales dentro
 *  de ella. Cada literal debe aparecer 2 veces (una por tabla). */
const TEXTO_PASTILLA_TABLE_COUNT = 2
const TEXTO_PASTILLA_TEXT_LITERALS = { '>Supermercados<': 2, '>Martes<': 2 }

/** El único archivo de deals/ que la app usa (ver la nota 3c del encabezado
 *  sobre los 2 .backup.html excluidos). */
const DEALS_FILE = 'deal_columnas.html'

/**
 * content_moleculas/ (16 archivos reales) — se COPIAN molecula_franja_logos.html
 * (fase 1, ver la nota 3d del encabezado: primer consumidor real es la pieza
 * FRANJA_LOGOS del banner), molecula_separador_s.html (fase 2: la molécula
 * SEPARADOR_LINEA del Título — ver bodyMoleculeRegistry.ts, moduleItems/render.ts.
 * NO confundir con molecula_separadores.html: esa es el espaciador invisible
 * S/M/general que ya usa la pieza SEPARADOR del banner desde fase 1; esta es
 * una línea decorativa con `role="molecula-separador"`, un archivo distinto),
 * y (fase 3, ver [[project_body_modules_plan_2026-08-26]]) los 4 archivos de
 * bullet (molecula_bullet_icono_{s,m,l}.html + molecula_bullet_numerado.html —
 * la pieza BULLET_ICONO/BULLET_NUMERADO del catálogo compartido, ver
 * moduleItems/render.ts) y molecula_icono.html (la pieza ICONO genérica,
 * primer consumidor real: el área libre de Beneficios).
 * El resto queda LISTADO pero SIN COPIAR: son la materia prima de los módulos
 * de body de fases futuras del plan de nuevos módulos de contenido (ver
 * [[project_body_modules_plan_2026-08-26]]) — listarlos ya evita el warning de
 * "archivo nuevo sin sincronizar" antes de que exista el código que los
 * consuma (mismo criterio que BANNER_MOLECULA_KNOWN_EXTRA_FILES).
 */
const CONTENT_MOLECULAS_FILES_TO_COPY = [
  'molecula_franja_logos.html',
  'molecula_separador_s.html',
  'molecula_bullet_icono_s.html',
  'molecula_bullet_icono_m.html',
  'molecula_bullet_icono_l.html',
  'molecula_bullet_numerado.html',
  'molecula_icono.html',
]
const CONTENT_MOLECULAS_KNOWN_PENDING_FILES = [
  'modificadores-texto.html',
  'molecula_img_automatica.html',
  'molecula_link_interno.html',
  'molecula_separadores.html',
  'molecula_tag_basico.html',
  'molecula_tag_icono.html',
  'molecula_tag_promo.html',
  'molecula_tag_verde.html',
  'molecula_texto_pastilla.html',
]

/** `molecula_franja_logos.html`: 1 sola `<td>` de logo, clonada 4 veces en el
 *  archivo real ("se agregan o quitan `<td>` para agregar o quitar logos") —
 *  components/banner/items/render.ts (FRANJA_LOGOS) toma la 1ra como plantilla
 *  para generar N logos, así que el discriminador de celda debe seguir
 *  apareciendo (cualquier cantidad ≥ 1, no un número fijo: agregar/quitar
 *  logos en el maestro es válido). El link y el ícono SÍ tienen que seguir
 *  ahí en cada celda encontrada. */
const FRANJA_LOGOS_CELL_RE = /<td style="padding:0px 2px; max-width: 80px;">[\s\S]*?<\/td>/g
const FRANJA_LOGOS_LINK_PLACEHOLDER = 'LINKLOGO'
const FRANJA_LOGOS_ICON_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j'

/** molecula_separador_s.html (pieza SEPARADOR_LINEA, ver moduleItems/render.ts):
 *  debe traer exactamente 1 vez su único role propio. */
const SEPARADOR_LINEA_ANCHOR = 'role="molecula-separador"'

/**
 * Fase 3 — molecula_bullet_icono_{s,m,l}.html (pieza BULLET_ICONO,
 * moduleItems/render.ts): las 3 comparten el mismo literal de título/texto
 * ('>Subtitulo<' / el bloque de texto de relleno), cada uno 1 vez. OJO — el
 * archivo NOMBRADO "l" trae internamente `role="molecula-iconoXL"` (no
 * "...iconoL"): typo/inconsistencia real del maestro, no se valida el role acá
 * porque moduleItems/render.ts elige el archivo por NOMBRE (mapeado desde
 * `size`), nunca por su role interno.
 */
const BULLET_ICONO_TITULO_LITERAL = '>Subtitulo<'
const BULLET_ICONO_TEXTO_LITERAL = 'bloque de texto bloque de texto bloque de texto'
const BULLET_ICONO_FILES = ['molecula_bullet_icono_s.html', 'molecula_bullet_icono_m.html', 'molecula_bullet_icono_l.html']

/** molecula_bullet_numerado.html (pieza BULLET_NUMERADO): el número de fábrica
 *  (' 1 ', con espacios) + el mismo par título/texto que BULLET_ICONO. */
const BULLET_NUMERADO_NUMERO_LITERAL = '> 1 <'

/** molecula_icono.html (pieza ICONO, moduleItems/render.ts): un solo archivo
 *  de referencia con 4 `<img>` alternativos (S/M/L/XL) — cada role debe seguir
 *  apareciendo exactamente 1 vez; el render elige uno por `fields.size`. */
const ICONO_ROLE_ANCHORS = ['role="molecula-iconoS"', 'role="molecula-iconoM"', 'role="molecula-iconoL"', 'role="molecula-iconoXL"']

/**
 * Anclas que components/title/render.ts (el shell del bloque) y
 * moduleItems/render.ts (las piezas TITULO_TEXTO/SUBTITULO_TEXTO que se
 * extraen del mismo archivo) necesitan en modulo-titulo.html — todas deben
 * aparecer exactamente 1 vez, contando sobre el archivo SIN COMENTARIOS
 * (mismo criterio que DEALS_ANCHOR_COUNTS).
 */
const TITLE_ANCHOR_COUNTS = {
  LINKMODULO: 1,
  // El <td> único que envuelve el área libre de moléculas — components/title/render.ts
  // reemplaza el <div> que sigue entero por el HTML de fields.items.
  '<td height="100%" valign="top" bgcolor="" role="">': 1,
  '{{bg_contenedor1_mail_general}}': 1,
  '{{body_container_background_radius}}': 1,
  '{{body_container_background_padding}}': 1,
  '{{body_alineado_molecular}}': 1,
  '>Titulo<': 1,
  'bloque de texto bloque de texto bloque de texto': 1,
  [SEPARADOR_LINEA_ANCHOR]: 1,
}

/**
 * Anclas que components/bullet/render.ts (el shell del bloque) necesita en
 * modulo_bullet.html — a diferencia de Título, este shell NO se reusa para
 * extraer texto (el icono+h3+h4 de fábrica del archivo se descarta entero: el
 * área libre por defecto trae un item BULLET_ICONO, sourced de su propio
 * archivo en content_moleculas/, no de este). Solo hacen falta las anclas del
 * SHELL (link + el <div> de fondo que envuelve toda el área libre).
 */
const BULLET_AREA_DIV_ANCHOR =
  '<div style="display: inline-block; background:{{bg_contenedor1_mail_general}}; border-radius: {{body_container_background_radius}}; overflow: hidden; width: 100%; max-width: 480px;">'
const BULLET_ANCHOR_COUNTS = {
  LINKMODULO: 1,
  [BULLET_AREA_DIV_ANCHOR]: 1,
  '{{alineado_molecular_mail_body}}': 1,
  '{{body_container_background_padding}}': 1,
}

/**
 * Anclas que components/benefits/render.ts (el shell + la celda 1 fija de
 * imagen) y moduleItems/render.ts (las piezas BENEFICIOS_TITULO/BENEFICIOS_TEXTO,
 * que SÍ se extraen de este mismo archivo — mismo criterio que TITULO_TEXTO/
 * SUBTITULO_TEXTO con modulo-titulo.html) necesitan en modulo-beneficios.html.
 * El icono + el <h5> vacío de fábrica de la celda 2 se descartan enteros (el
 * área libre por defecto trae un item ICONO propio, sourced de
 * content_moleculas/molecula_icono.html) — por eso no se ancla el icono de
 * fábrica acá.
 */
/**
 * Anclas que components/col1/render.ts necesita en modulo-1columna.html —
 * el `<div role="divcomponentes">` del área "arriba" (reusado literal para
 * CONSTRUIR el área "abajo" cuando hace falta, ver la nota grande de ese
 * archivo), el `<div role="contenedorgeneral">` donde se ancla esa
 * inserción, LINKMODULO y la URL de fábrica de la imagen.
 */
const COL1_DIVCOMPONENTES_ANCHOR = '<div role="divcomponentes" style="display: inline-block; padding: {{body_container_background_padding}};">'
const COL1_CONTENEDORGENERAL_ANCHOR =
  '<div role="contenedorgeneral" style="background:{{bg_contenedor1_mail_general}}; border-radius: {{body_container_background_radius}}; overflow: hidden;">'
const COL1_IMAGE_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1OEXxNDtUklgU4W8sta2zOzdZ4rZYq7PO'
const COL1_ANCHOR_COUNTS = {
  LINKMODULO: 1,
  [COL1_DIVCOMPONENTES_ANCHOR]: 1,
  [COL1_CONTENEDORGENERAL_ANCHOR]: 1,
  [COL1_IMAGE_URL_PLACEHOLDER]: 1,
}

/**
 * Anclas que components/col3/render.ts necesita en modulo-3-columnas.html —
 * el `<td>` de apertura de celda (idéntico en las 3, usado para CORTAR el
 * archivo en sus 3 celdas), el `role="divcomponentes"` de cada área libre, el
 * ícono M de fábrica (misma URL en las 3 celdas), las 3 URLs de imagen "full"
 * (DISTINTAS entre sí, una por celda) y los 3 `{{...}}` que solo existen acá
 * (ninguno de los módulos anteriores usa el padding CHICO del contenedor).
 * `LINKCELDA1`/`LINKCELDA3` documentan el typo REAL del maestro (la celda 2
 * repite el token de la celda 1 en vez de "LINKCELDA2" — ver risk #4/#6 del
 * plan): 2 y 1 respectivamente, NO 1 y 1 — si el día de mañana el maestro
 * corrige el typo, este conteo falla y avisa (el render en sí ya es robusto a
 * ese cambio, ver CELL_LINK_ATTR_RE en components/col3/render.ts).
 */
const COL3_CELL_TD_OPEN =
  '<td style="padding:0px 0px 0px 0px; line-height:23px; text-align:inherit; " height="100%" valign="top" bgcolor="" role="">'
const COL3_ICONO_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/13Wpazp2ezX37GZylmssneVLoF0fxq2yi'
const COL3_CELL_IMAGE_URL_PLACEHOLDERS = [
  'https://lh3.googleusercontent.com/d/1GvgYi4hdEYq1b71GrXp-UVfidhkEVeE1?v1',
  'https://lh3.googleusercontent.com/d/1c5vhJ8Hvr-weWRB5n3xKICSbou2mrcxd?v1',
  'https://lh3.googleusercontent.com/d/1Ff8AXjzhjsXyBrUwk4S4A02gjOpAg3a0?v1',
]
const COL3_ANCHOR_COUNTS = {
  [COL3_CELL_TD_OPEN]: 3,
  'role="divcomponentes"': 3,
  '{{body_container_background_padding-peq}}': 3,
  '{{bg_contenedor1_mail_general}}': 3,
  '{{body_container_background_radius}}': 3,
  '{{alineado_molecular_mail_body}}': 3,
  '{{body_alineado_molecular}}': 3,
  '{{color_texto_mail_general}}': 3,
  [COL3_ICONO_URL_PLACEHOLDER]: 3,
  'Texto corto': 3,
  'href="LINKCELDA1"': 2, // sic, typo del maestro — la celda 2 repite el token de la celda 1
  'href="LINKCELDA3"': 1,
  [COL3_CELL_IMAGE_URL_PLACEHOLDERS[0]]: 1,
  [COL3_CELL_IMAGE_URL_PLACEHOLDERS[1]]: 1,
  [COL3_CELL_IMAGE_URL_PLACEHOLDERS[2]]: 1,
}

/**
 * Anclas que components/col2/render.ts necesita en modulo-2-columnas.html —
 * primer módulo "dual-table": TODAS las piezas variables (área libre, las 2
 * divs de imagen, los tokens de fondo/alineado de la imagen) aparecen
 * EXACTAMENTE 2 veces (una por tabla, escritorio+mobile, byte-idénticas),
 * salvo `LINKMODULOCOULUMNAS`/`bg_contenedor1_mail_general` (el fondo/link
 * general envuelve LAS 2 TABLAS ENTERAS, 1 sola vez) — esta asimetría 1-vs-2
 * es justamente lo que separa "variable de módulo única" (fondo general,
 * click, alineado) de "variable POR FORMATO" (todo lo demás) en este maestro.
 */
const COL2_LINK_TOKEN = 'LINKMODULOCOULUMNAS' // sic, typo del maestro ("COULUMNAS")
const COL2_IMAGE_URL_FULL = 'https://lh3.googleusercontent.com/d/1Xs3HucYUDlfipuPnegf5ZXO3w2Z5m28u'
const COL2_IMAGE_URL_MODIFICABLE = 'https://lh3.googleusercontent.com/d/14VKG5CPVNPIVbOQYkyHgtxfW1uLorjXP'
const COL2_ANCHOR_COUNTS = {
  [COL2_LINK_TOKEN]: 1,
  '{{bg_contenedor1_mail_general}}': 1,
  '{{body_container_background_radius}}': 2,
  '{{body_container_background_padding}}': 2,
  '{{body_alineado_molecular}}': 2,
  '{{alineado_molecular_mail_body}}': 2,
  '{{img_overlay_2_mail_general}}': 2,
  '{{body_img_modulo_auto_ancho}}': 2,
  'role="columna-textos"': 2,
  'background-image: url({{img_overlay_2_mail_general}})': 2,
  '>Titulo<': 2,
  'bloque de texto bloque de texto bloque de texto': 2,
  [COL2_IMAGE_URL_FULL]: 2,
  [COL2_IMAGE_URL_MODIFICABLE]: 2,
  mobile_hide: 1,
  desktop_hide: 1,
}

/**
 * Anclas que components/logos/render.ts necesita en modulo-logos.html — mismo
 * shape que COL2 (fondo/link/alineado generales 1 vez, área libre/tokens de
 * fondo 2 veces, una por tabla), MÁS las 2 celdas de grilla — vienen VACÍAS en
 * el shell (solo comentarios), ancladas por su `<td>` de apertura completo
 * (distinto por formato: 60%/escritorio vs 100%/mobile, no hay literal
 * compartido como en COL2).
 */
const LOGOS_LINK_TOKEN = 'LINKMODULLOGOS' // sic, typo del maestro (falta la "O" de "MODULO")
const LOGOS_DESKTOP_GRID_TD_ANCHOR = '<td width="60%" style="vertical-align: middle; text-align:center; overflow: hidden; border-radius: 10px; ">'
const LOGOS_MOBILE_GRID_TD_ANCHOR = '<td width="100%" style="vertical-align: middle; text-align:left;  ">'
const LOGOS_MODULE_ANCHOR_COUNTS = {
  [LOGOS_LINK_TOKEN]: 1,
  '{{bg_contenedor1_mail_general}}': 1,
  '{{body_container_background_radius}}': 2,
  '{{body_container_background_padding}}': 2,
  '{{body_alineado_molecular}}': 2,
  '{{alineado_molecular_mail_body}}': 2,
  'role="columna-textos"': 2,
  '>Titulo<': 2,
  'bloque de texto bloque de texto bloque de texto': 2,
  [LOGOS_DESKTOP_GRID_TD_ANCHOR]: 1,
  [LOGOS_MOBILE_GRID_TD_ANCHOR]: 1,
  mobile_hide: 1,
  desktop_hide: 1,
}

/**
 * Anclas por archivo de grilla — las 3 comparten la misma URL placeholder de
 * fondo (una por logo) y `border-radius: 7px` (una por logo), pero difieren
 * en cómo anclan cada celda: grilla3/6 traen `role="logoN"` (risk #2 del
 * plan — grilla4 NO trae role en ninguna celda, se ancla por posición
 * documental: `<th style=` × 2 primero, `<td style=` × 2 después, ambos
 * anclados en el placeholder compartido). `AQUIELLINKDELOGO2` en grilla6
 * aparece 2 VECES a propósito (sic — la celda `role="logo3"` repite el token
 * de logo2 en vez de "AQUIELLINKDELOGO3", que no existe en el archivo; ver
 * risk #2/#6 del plan) — encerrar el conteo real, no el "correcto", para que
 * un fix del maestro avise en vez de pasar desapercibido (mismo criterio que
 * LINKCELDA1/2 en COL3).
 */
const LOGO_BG_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1B4hOqqkpKSu2cQHale6dE-hfLX6yfO7O'
const LOGOS_GRID_ANCHOR_COUNTS = {
  'grilla3logos.html': {
    'role="logo1"': 1,
    'role="logo2"': 1,
    'role="logo3"': 1,
    [LOGO_BG_PLACEHOLDER]: 3,
    AQUIELLINKDELOGO1: 1,
    AQUIELLINKDELOGO2: 1,
    AQUIELLINKDELOGO3: 1,
    'border-radius: 7px': 3,
  },
  'grilla4logos.html': {
    '<th style=': 2,
    '<td style=': 2,
    [LOGO_BG_PLACEHOLDER]: 4,
    AQUIELLINKDELOGO1: 1,
    AQUIELLINKDELOGO2: 1,
    AQUIELLINKDELOGO3: 1,
    AQUIELLINKDELOGO4: 1,
    'border-radius: 7px': 4,
  },
  'grilla6logos.html': {
    'role="logo1"': 1,
    'role="logo2"': 1,
    'role="logo3"': 1,
    'role="logo4"': 1,
    'role="logo5"': 1,
    'role="logo6"': 1,
    [LOGO_BG_PLACEHOLDER]: 6,
    AQUIELLINKDELOGO1: 1,
    AQUIELLINKDELOGO2: 2, // sic, typo del maestro — logo3 repite el token de logo2
    AQUIELLINKDELOGO4: 1,
    AQUIELLINKDELOGO5: 1,
    AQUIELLINKDELOGO6: 1,
    'border-radius: 7px': 6,
  },
}

const BENEFICIOS_IMAGE_URL_PLACEHOLDER = 'https://lh3.googleusercontent.com/d/1K55fPu7buJT65XOj9VqaplZD2J4WTaTb'
const BENEFICIOS_TITULO_LITERAL = '>Descuentos de hasta xxx<'
const BENEFICIOS_TEXTO_LITERAL = 'En todos tus pedidos en la app, pidiendo desde $XXXXXX'
/**
 * Ancla que components/contenidos/render.ts necesita en _contenidos_wrapper.html
 * — el <td> único del área libre ("MOLECULAS BODY" en el maestro) donde se
 * insertan los bloques de CONTENIDOS + Cierre, ambos dentro de esta misma
 * tabla (ver la nota grande en components/contenidos/render.ts).
 */
const CONTENIDOS_WRAPPER_ANCHOR_COUNTS = {
  '<td style="padding:0px;margin:0px;border-spacing:0;">': 1,
}

const BENEFICIOS_ANCHOR_COUNTS = {
  LINKMODULO: 1,
  '{{body_container_background_radius}}': 1,
  '{{body_container_background_border}}': 1,
  '{{bg_contenedor1_mail_general}}': 1,
  '{{body_container_background_padding}}': 1,
  'role="celda2"': 1,
  [BENEFICIOS_IMAGE_URL_PLACEHOLDER]: 1,
  [BENEFICIOS_TITULO_LITERAL]: 1,
  [BENEFICIOS_TEXTO_LITERAL]: 1,
}

/**
 * Cuántas veces debe aparecer cada ancla de deal_columnas.html, contando sobre
 * el archivo SIN COMENTARIOS — que es exactamente lo que ve
 * src/components/deals/render.ts (arranca con stripComments, igual que los
 * renders de banner). La distinción importa: las URLs de ejemplo de la imagen
 * de producto y del logo aparecen 4 veces en el archivo crudo (2 dentro de
 * comentarios que explican "se puede reemplazar la imagen del ...", 2 en los
 * atributos reales) y solo 2 al quitar los comentarios.
 *
 * El archivo trae las 2 celdas del par byte a byte iguales, así que casi todo
 * va 2 veces (1 por celda); los 2 tags y su texto van 4 (2 por celda).
 */
/** Genérico — también lo usan las validaciones de molecula_separadores.html y
 *  molecula_texto_pastilla.html más abajo (mismo criterio: contar sobre el
 *  archivo sin comentarios, que es lo que ven sus renders). */
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
const DEALS_ANCHOR_COUNTS = {
  // Aperturas/cierres de celda: components/deals/render.ts los usa para
  // extraer las 3 plantillas de celda (imágenes / textos / legales). Los
  // cierres son literales "atómicos" de 2 tags a propósito: la celda de
  // imagen anida otra tabla, así que un `</td>` suelto cortaría en el interno.
  '<td width="50%" style="width: 50%" >': 2,
  '<td width="50%" style="width: 50%; vertical-align: top;': 2,
  '<td width="50%" style="width: 50%;" >': 2,
  '</table></td>': 2,
  '</a></td>': 2,
  // Link (token de relleno manual, no Liquid) — 1 por celda, cada tarjeta
  // resuelve el suyo. No hay LINKDEAL1/LINKDEAL2 en el archivo real.
  LINKDEAL: 2,
  // Piezas de la celda de textos, en orden de aparición.
  '{{deals_copy_1_promo}}': 2,
  '{{deals_copy_2_promo}}': 2,
  'role="MARKDOWN"': 2,
  '{{coronapro_mail_body}}': 2,
  '>$999</h4>': 2,
  'role="COMPLEMENTO 1"': 2,
  '>99% OFF</h5>': 2,
  'role="COMPLEMENTO 2"': 2,
  '$999</del>': 2,
  'role="CATEGORIA"': 2,
  '>Italiana</h5>': 2,
  'role="RATING"': 2,
  '&nbsp;4.9</h5>': 2,
  'role="TIEMPO"': 2,
  '&nbsp;xx min.</h5>': 2,
  'role="molecula-tag"': 4,
  '> tag 1 </h5>': 4,
  '<strong>Pide ahora': 2,
  // Celda de imagen. Desde el pull 2026-08-21 (bd9f4a5) cada celda trae 2
  // <img role="molecula-iconoL">, no 1: el "Logo 1:1" de siempre + un nuevo
  // "Logo pastilla" (pill, 23px alto) que la app todavía no expone como campo
  // editable — components/deals/render.ts lo oculta explícitamente para
  // preservar el comportamiento visual de un solo logo (mismo criterio que
  // molecula_texto_pastilla.html en banners: pieza nueva del maestro, flagueada
  // pero no construida todavía). Por eso el ancla del role se duplicó a 4 (2
  // por celda) pero la URL del logo 1:1 de siempre se mantiene en 2 — son
  // <img> distintos, cada uno con su propia URL única.
  'role="molecula-iconoL"': 4,
  'https://images.rappi.com/products/77c714d6-2d05-493e-8f33-c66711864ca7.png': 2,
  'https://lh3.googleusercontent.com/d/1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j': 2,
  // El nuevo "Logo pastilla" — mismo criterio de conteo que el resto: si el
  // maestro cambia esta URL o deja de traerla 2 veces, sync-master aborta en
  // vez de dejar que components/deals/render.ts oculte el elemento equivocado
  // en silencio.
  'https://lh3.googleusercontent.com/d/1IY3lFRQnvb9g7cGALAbRBywZ6YpO6QLe': 2,
  // Íconos por defecto de TAG1 y TAG2 — distintos entre sí, y es justamente
  // por eso que el render los usa para desambiguar cuál tag es cuál.
  'https://lh3.googleusercontent.com/d/1rofiEyeYdjqVsiEL3-NWsOfXOSMQRVNa': 2,
  'https://lh3.googleusercontent.com/d/19wcynrgz0OqdDt5S5fVf7yaSx7rAN4Fn': 2,
  // Celda de legales.
  '<span role="molecula-texto" class="legal"': 2,
  '>Aplican términos y condiciones | </span>': 2,
}

/** Debe quedar sincronizado con HEADER_BRAND_VALUES de src/components/header/schema.ts. */
const HEADER_BRANDS = [
  'rappi',
  'rappi-travel',
  'soyrappi',
  'rappi-turbo',
  'rappi-turbo-rest',
  'rappi-pro',
  'rappi-pro-black',
  'rappi-defensoria',
  'rappi-entregador',
  'contenido-aliado',
]
const HEADER_VARIANT_FILES = ['centrado-claro.html', 'centrado-oscuro.html', 'columnas-claro.html', 'columnas-oscuro.html']
const HEADER_WRAPPER_FILE = '_header-wrapper.html'
const HEADER_WRAPPER_MARKER = '<!-- ACA VA EL HEADER -->'
/** Debe quedar sincronizado con HEADER_WRAPPER_PLACEHOLDER_RE de src/template/assemble.ts. */
const HEADER_WRAPPER_PLACEHOLDER_RE = /<!--\s*HEADER WRAPPER[\s\S]*?CIERRE HEADER WRAPPER\s*-->/g

/** Debe quedar sincronizado con TEMA_ASSIGN_RE de src/template/assemble.ts. */
const TEMA_ASSIGN_RE = /\{%\s*assign\s+tema_general_mail_general\s*=\s*'[^']*'\s*%\}/g
/** Deben quedar sincronizados con src/themes/themes.ts. */
const THEME_BRANCH_RE = /tema_general_mail_general\s*==\s*'([^']+)'/g
const COLOR_FOOTER_RE = /color_footer_mail_general\s*=\s*'([^']+)'/

const FOUNDATIONS_INJECTIONS = [
  {
    file: 'head-meta-tags.html',
    placeholder: '<!-- primero se llama: head-meta-tags.html con todos los temas en liquid  -->',
    // Ya no requerido desde el pull 2026-08-21 — ver la nota grande del
    // encabezado. La copia SUELTA (más abajo, "3. Copia head-meta-tags.html
    // SUELTO") sigue siendo obligatoria: esta bandera solo afecta si se exige
    // el placeholder de INYECCIÓN dentro de template_base.html.
    required: false,
  },
  {
    file: 'global-styles.html',
    placeholder: '<!--en este espacio se llama: global-styles.html con todo el head y css   -->',
    required: true,
  },
]

console.log(`${DIM}sync-master${RESET} · master: ${MASTER_DIR}`)

// --- maestro: leer + validar marcadores de slot --------------------------------
const templateBasePath = EXAMPLES_DIR_NAME && path.join(MASTER_DIR, EXAMPLES_DIR_NAME, TEMPLATE_BASE_NAME)
let templateBaseHtml = ''
if (!templateBasePath) {
  // resolveNumberedDir ya reportó el motivo.
} else if (!fs.existsSync(templateBasePath)) {
  fail(`No se encontró ${TEMPLATE_BASE_SOURCE} en ${MASTER_DIR}`)
} else {
  templateBaseHtml = fs.readFileSync(templateBasePath, 'utf8')
  for (const { slot, text } of SLOT_MARKERS) {
    const re = new RegExp(`<!--\\s*${text}\\s*-->`, 'g')
    const matches = templateBaseHtml.match(re) ?? []
    if (matches.length !== 1) {
      fail(
        `El marcador <!-- ${text} --> (slot ${slot}) aparece ${matches.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`,
      )
    }
  }

  // Ya NO aborta si falta (ver la nota grande del encabezado, pull
  // 2026-08-21): es una copia redundante de la misma línea que head-meta-tags.html
  // ya trae, no una anchor funcional real. Se avisa igual por si el conteo
  // cambia a algo raro (>1, por ejemplo), pero solo como warning.
  const temaAssigns = templateBaseHtml.match(TEMA_ASSIGN_RE) ?? []
  if (temaAssigns.length > 1) {
    console.warn(
      `${DIM}⚠ El {% assign tema_general_mail_general = '...' %} aparece ${temaAssigns.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 0 o 1).${RESET}`,
    )
  }

  const headerPlaceholders = templateBaseHtml.match(HEADER_WRAPPER_PLACEHOLDER_RE) ?? []
  if (headerPlaceholders.length !== 1) {
    fail(
      `El placeholder "HEADER WRAPPER … CIERRE HEADER WRAPPER" aparece ${headerPlaceholders.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`,
    )
  }

  const contenidosPlaceholders = templateBaseHtml.match(CONTENIDOS_WRAPPER_PLACEHOLDER_RE) ?? []
  if (contenidosPlaceholders.length !== 1) {
    fail(
      `El placeholder "WRAPPER DE CONTENIDOS" aparece ${contenidosPlaceholders.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`,
    )
  }

  const bannerPlaceholders = templateBaseHtml.match(BANNER_PLACEHOLDER_RE) ?? []
  if (bannerPlaceholders.length !== 1) {
    fail(
      `El placeholder "<!-- BANNER : …" aparece ${bannerPlaceholders.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`,
    )
  }
}

// --- NN-foundations/global-styles: leer + validar placeholders -----------------
const foundationsFileContents = {}
if (templateBaseHtml && FOUNDATIONS_DIR) {
  for (const { file, placeholder, required } of FOUNDATIONS_INJECTIONS) {
    const fp = path.join(FOUNDATIONS_DIR, file)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${FOUNDATIONS_DIR_NAME}/global-styles/${file}`)
      continue
    }
    foundationsFileContents[file] = fs.readFileSync(fp, 'utf8')

    // "Al menos 1", no "exactamente 1" — ver la nota grande del encabezado
    // sobre el placeholder de global-styles.html duplicado por accidente.
    const count = templateBaseHtml.split(placeholder).length - 1
    if (count < 1) {
      const message = `El placeholder de ${file} no aparece en ${TEMPLATE_BASE_SOURCE} (se esperaba al menos 1)`
      if (required) {
        fail(message)
      } else {
        // head-meta-tags.html: ya no es obligatorio, ver la nota grande del
        // encabezado (pull 2026-08-21) — se avisa y esa inyección puntual se
        // salta más abajo (el `.replace()` sobre un placeholder ausente ya es
        // un no-op seguro de por sí).
        console.warn(`${DIM}⚠ ${message} — se omite esa inyección puntual (no afecta el HTML final, ver nota).${RESET}`)
      }
    }
  }
}

// --- head-meta-tags.html: validar que declare temas -----------------------------
// Ya NO se exige que cada tema defina `color_footer_mail_general` — el repo lo
// quitó de las 11 ramas sin reemplazo (ver la nota grande del encabezado).
// Solo se avisa, sin abortar; themes.ts compensa con su propio fallback.
const headMetaHtml = foundationsFileContents['head-meta-tags.html']
let themeCount = 0
const themesMissingColorFooter = []
if (headMetaHtml) {
  const branches = [...headMetaHtml.matchAll(THEME_BRANCH_RE)]
  themeCount = branches.length
  if (themeCount === 0) {
    fail('head-meta-tags.html no declara ningún tema (no se encontró tema_general_mail_general == \'...\')')
  }
  for (const [i, branch] of branches.entries()) {
    const chunk = headMetaHtml.slice(branch.index, branches[i + 1]?.index ?? headMetaHtml.length)
    if (!COLOR_FOOTER_RE.test(chunk)) {
      themesMissingColorFooter.push(branch[1])
    }
  }
}

// --- NN-components/NN_footer/*.html -----------------------------------------------
const footerFileContents = {}
if (FOOTER_DIR) {
  for (const name of FOOTER_FILES) {
    const fp = path.join(FOOTER_DIR, name)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${COMPONENTS_DIR_NAME}/${FOOTER_SUBDIR_NAME}/${name} en ${MASTER_DIR}`)
      continue
    }
    footerFileContents[name] = fs.readFileSync(fp, 'utf8')
  }
}

// --- NN-components/NN_closing/cierre.html -----------------------------------------
let cierreFileContent = ''
if (CIERRE_DIR) {
  const fp = path.join(CIERRE_DIR, CIERRE_FILE)
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${COMPONENTS_DIR_NAME}/${CIERRE_SUBDIR_NAME}/${CIERRE_FILE} en ${MASTER_DIR}`)
  } else {
    cierreFileContent = fs.readFileSync(fp, 'utf8')
  }
}

// --- NN-components/NN_ctas/cta-template.html ---------------------------------------
let ctaTemplateContent = ''
if (CTAS_DIR) {
  const fp = path.join(CTAS_DIR, CTA_FILE)
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${COMPONENTS_DIR_NAME}/${CTAS_SUBDIR_NAME}/${CTA_FILE} en ${MASTER_DIR}`)
  } else {
    ctaTemplateContent = fs.readFileSync(fp, 'utf8')
  }
}

// --- NN-components/NN_banners/** ----------------------------------------------------
// 2 archivos "shell" (big-banner-horizontal/vertical.html) + 16 de banner_moleculas/
// (ver BANNER_MOLECULA_FILES arriba para los 4 excluidos a propósito).
const bannerFileContents = {}
if (BANNERS_DIR) {
  for (const name of BANNER_FILES) {
    const fp = path.join(BANNERS_DIR, name)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${name} en ${MASTER_DIR}`)
      continue
    }
    const content = fs.readFileSync(fp, 'utf8')

    const anchorCount = content.split(BANNER_MOLECULAS_ANCHOR).length - 1
    if (anchorCount !== 1) {
      fail(`${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${name}: el ancla "${BANNER_MOLECULAS_ANCHOR}" aparece ${anchorCount} veces (se esperaba 1) — revisar components/banner/shell.ts`)
    }
    const linkCount = content.split(BANNER_LINK_PLACEHOLDER).length - 1
    if (linkCount !== 2) {
      fail(`${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${name}: "${BANNER_LINK_PLACEHOLDER}" aparece ${linkCount} veces (se esperaba 2: href + originalsrc)`)
    }
    if (!content.includes('</div></td>')) {
      fail(`${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${name}: no se encontró el cierre "</div></td>" que components/banner/shell.ts usa como ancla de cierre`)
    }

    bannerFileContents[name] = content
  }
}

const bannerMoleculaFileContents = {}
if (BANNER_MOLECULAS_DIR) {
  for (const name of BANNER_MOLECULA_FILES) {
    const fp = path.join(BANNER_MOLECULAS_DIR, name)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/${name} en ${MASTER_DIR}`)
      continue
    }
    bannerMoleculaFileContents[name] = fs.readFileSync(fp, 'utf8')
  }

  // modulo_tags_{horizontal,vertical}.html deben traer exactamente 3 pills —
  // components/banner/items/render.ts asume esa cantidad para poder templetear
  // 1-3 etiquetas editables a partir del archivo real.
  for (const name of ['modulo_tags_horizontal.html', 'modulo_tags_vertical.html']) {
    const content = bannerMoleculaFileContents[name]
    if (!content) continue
    const pillCount = content.split(TAG_PILL_DISCRIMINATOR).length - 1
    if (pillCount !== 3) {
      fail(`${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/${name}: se esperaban 3 pills de tag ("${TAG_PILL_DISCRIMINATOR}") y hay ${pillCount} — revisar components/banner/items/render.ts`)
    }
  }

  // molecula_separadores.html (pieza SEPARADOR): cada uno de los 3 <div> de
  // tamaño fijo debe aparecer exactamente 1 vez — components/banner/items/render.ts
  // los recorta por literal exacto, sin comentarios (mismo criterio que el resto
  // de los renders de pieza).
  {
    const content = bannerMoleculaFileContents['molecula_separadores.html']
    if (content) {
      const stripped = content.replace(HTML_COMMENT_RE, '')
      for (const literal of SEPARADOR_DIV_LITERALS) {
        const count = stripped.split(literal).length - 1
        if (count !== 1) {
          fail(
            `${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/molecula_separadores.html: "${literal}" aparece ${count} veces sin comentarios (se esperaba 1) — revisar components/banner/items/render.ts`,
          )
        }
      }
    }
  }

  // molecula_texto_pastilla.html (pieza TEXTO_PASTILLA): 2 tablas alternas +
  // 2 textos literales, 2 veces cada uno (una por tabla) — mismo criterio.
  {
    const content = bannerMoleculaFileContents['molecula_texto_pastilla.html']
    if (content) {
      const stripped = content.replace(HTML_COMMENT_RE, '')
      const tableCount = (stripped.match(/<table>/g) ?? []).length
      if (tableCount !== TEXTO_PASTILLA_TABLE_COUNT) {
        fail(
          `${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/molecula_texto_pastilla.html: hay ${tableCount} tablas "<table>" sin comentarios (se esperaban ${TEXTO_PASTILLA_TABLE_COUNT}) — revisar components/banner/items/render.ts`,
        )
      }
      for (const [literal, expected] of Object.entries(TEXTO_PASTILLA_TEXT_LITERALS)) {
        const count = stripped.split(literal).length - 1
        if (count !== expected) {
          fail(
            `${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/molecula_texto_pastilla.html: "${literal}" aparece ${count} veces sin comentarios (se esperaban ${expected}) — revisar components/banner/items/render.ts`,
          )
        }
      }
    }
  }

  // molecula_cta_interno_*: no se copian (ver nota de CTA_INTERNO_FIXED_ALIGN),
  // pero si el maestro cambió su cta_alineado fijo hay que enterarse: el
  // hardcode de components/banner/items/render.ts quedaría desactualizado en
  // silencio si no se aborta acá.
  for (const [name, expectedAssign] of Object.entries(CTA_INTERNO_FIXED_ALIGN)) {
    const fp = path.join(BANNER_MOLECULAS_DIR, name)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/${name} en ${MASTER_DIR}`)
      continue
    }
    const content = fs.readFileSync(fp, 'utf8')
    if (!content.includes(expectedAssign)) {
      fail(`${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/${name} ya no contiene "${expectedAssign}" — revisar el align fijo hardcodeado en components/banner/items/render.ts (CTA_INTERNO)`)
    }
  }

  // Aviso (no aborta): un archivo nuevo en banner_moleculas/ que el script no
  // conoce pasa desapercibido si no se avisa acá.
  let actualMoleculaFiles = []
  try {
    actualMoleculaFiles = fs.readdirSync(BANNER_MOLECULAS_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}: ${e.message}`)
  }
  const knownMoleculaFiles = new Set([...BANNER_MOLECULA_FILES, ...BANNER_MOLECULA_KNOWN_EXTRA_FILES])
  const unknownMoleculaFiles = actualMoleculaFiles.filter((f) => !knownMoleculaFiles.has(f))
  if (unknownMoleculaFiles.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/${BANNER_MOLECULAS_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownMoleculaFiles.join(', ')} — revisar si hace falta agregarlos a BANNER_MOLECULA_FILES.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/deals/deal_columnas.html -----------------
let dealsFileContent = ''
if (DEALS_DIR) {
  const fp = path.join(DEALS_DIR, DEALS_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${DEALS_DIR_NAME}/${DEALS_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(DEALS_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/deals/render.ts`)
      }
    }
    dealsFileContent = content
  }

  // Aviso (no aborta): mismo criterio que banner_moleculas/ — un archivo nuevo
  // en deals/ que el script no conoce pasaría desapercibido.
  const knownDealsFiles = new Set([DEALS_FILE, 'deal-large.backup.html', 'deal-small.backup.html'])
  let actualDealsFiles = []
  try {
    actualDealsFiles = fs.readdirSync(DEALS_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${DEALS_DIR_NAME}: ${e.message}`)
  }
  const unknownDealsFiles = actualDealsFiles.filter((f) => !knownDealsFiles.has(f))
  if (unknownDealsFiles.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${DEALS_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownDealsFiles.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/content_moleculas/ -----------------------
const contentMoleculaFileContents = {}
if (CONTENT_MOLECULAS_DIR) {
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${CONTENT_MOLECULAS_DIR_NAME}`
  for (const name of CONTENT_MOLECULAS_FILES_TO_COPY) {
    const fp = path.join(CONTENT_MOLECULAS_DIR, name)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${label}/${name} en ${MASTER_DIR}`)
      continue
    }
    contentMoleculaFileContents[name] = fs.readFileSync(fp, 'utf8')
  }

  // molecula_franja_logos.html: al menos 1 celda de logo, cada una con su
  // link y su ícono — components/banner/items/render.ts (FRANJA_LOGOS) toma la
  // 1ra como plantilla, así que ninguna puede faltar esas 2 anclas.
  const franjaLogosContent = contentMoleculaFileContents['molecula_franja_logos.html']
  if (franjaLogosContent) {
    const stripped = franjaLogosContent.replace(HTML_COMMENT_RE, '')
    const cells = [...stripped.matchAll(FRANJA_LOGOS_CELL_RE)]
    if (cells.length === 0) {
      fail(`${label}/molecula_franja_logos.html: no se encontró ninguna celda de logo sin comentarios — revisar components/banner/items/render.ts`)
    }
    for (const [i, cell] of cells.entries()) {
      if (!cell[0].includes(FRANJA_LOGOS_LINK_PLACEHOLDER)) {
        fail(`${label}/molecula_franja_logos.html: la celda de logo ${i + 1} ya no trae "${FRANJA_LOGOS_LINK_PLACEHOLDER}" — revisar components/banner/items/render.ts`)
      }
      if (!cell[0].includes(FRANJA_LOGOS_ICON_PLACEHOLDER)) {
        fail(`${label}/molecula_franja_logos.html: la celda de logo ${i + 1} ya no trae "${FRANJA_LOGOS_ICON_PLACEHOLDER}" — revisar components/banner/items/render.ts`)
      }
    }
  }

  // molecula_separador_s.html (pieza SEPARADOR_LINEA): su único role propio
  // debe seguir apareciendo exactamente 1 vez sin comentarios.
  const separadorLineaContent = contentMoleculaFileContents['molecula_separador_s.html']
  if (separadorLineaContent) {
    const stripped = separadorLineaContent.replace(HTML_COMMENT_RE, '')
    const count = stripped.split(SEPARADOR_LINEA_ANCHOR).length - 1
    if (count !== 1) {
      fail(`${label}/molecula_separador_s.html: "${SEPARADOR_LINEA_ANCHOR}" aparece ${count} veces sin comentarios (se esperaba 1) — revisar moduleItems/render.ts`)
    }
  }

  // molecula_bullet_icono_{s,m,l}.html (pieza BULLET_ICONO): los 3 comparten
  // el mismo par de literales de título/texto, 1 vez cada uno.
  for (const name of BULLET_ICONO_FILES) {
    const content = contentMoleculaFileContents[name]
    if (!content) continue
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const literal of [BULLET_ICONO_TITULO_LITERAL, BULLET_ICONO_TEXTO_LITERAL]) {
      const count = stripped.split(literal).length - 1
      if (count !== 1) {
        fail(`${label}/${name}: "${literal}" aparece ${count} veces sin comentarios (se esperaba 1) — revisar moduleItems/render.ts`)
      }
    }
  }

  // molecula_bullet_numerado.html (pieza BULLET_NUMERADO): el número de
  // fábrica + el mismo par título/texto de arriba.
  const bulletNumeradoContent = contentMoleculaFileContents['molecula_bullet_numerado.html']
  if (bulletNumeradoContent) {
    const stripped = bulletNumeradoContent.replace(HTML_COMMENT_RE, '')
    for (const literal of [BULLET_NUMERADO_NUMERO_LITERAL, BULLET_ICONO_TITULO_LITERAL, BULLET_ICONO_TEXTO_LITERAL]) {
      const count = stripped.split(literal).length - 1
      if (count !== 1) {
        fail(`${label}/molecula_bullet_numerado.html: "${literal}" aparece ${count} veces sin comentarios (se esperaba 1) — revisar moduleItems/render.ts`)
      }
    }
  }

  // molecula_icono.html (pieza ICONO): los 4 roles S/M/L/XL, 1 vez cada uno.
  const iconoContent = contentMoleculaFileContents['molecula_icono.html']
  if (iconoContent) {
    const stripped = iconoContent.replace(HTML_COMMENT_RE, '')
    for (const anchor of ICONO_ROLE_ANCHORS) {
      const count = stripped.split(anchor).length - 1
      if (count !== 1) {
        fail(`${label}/molecula_icono.html: "${anchor}" aparece ${count} veces sin comentarios (se esperaba 1) — revisar moduleItems/render.ts`)
      }
    }
  }

  // Aviso (no aborta): mismo criterio que banner_moleculas/ y deals/ — un
  // archivo nuevo en content_moleculas/ que el script no conoce pasaría
  // desapercibido.
  let actualContentMoleculaFiles = []
  try {
    actualContentMoleculaFiles = fs.readdirSync(CONTENT_MOLECULAS_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${label}: ${e.message}`)
  }
  const knownContentMoleculaFiles = new Set([...CONTENT_MOLECULAS_FILES_TO_COPY, ...CONTENT_MOLECULAS_KNOWN_PENDING_FILES])
  const unknownContentMoleculaFiles = actualContentMoleculaFiles.filter((f) => !knownContentMoleculaFiles.has(f))
  if (unknownContentMoleculaFiles.length > 0) {
    console.warn(`${DIM}⚠ ${label}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownContentMoleculaFiles.join(', ')} — revisar si hace falta agregarlos.${RESET}`)
  }
}

// --- NN-components/NN_content-modules/title/modulo-titulo.html -----------------
// Fase 2 del plan de nuevos módulos de contenido — primer ContentBlockType
// nuevo desde CTA/DEALS, ver components/title/render.ts + moduleItems/render.ts.
let titleFileContent = ''
if (TITLE_DIR) {
  const fp = path.join(TITLE_DIR, TITLE_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${TITLE_DIR_NAME}/${TITLE_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(TITLE_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/title/render.ts y moduleItems/render.ts`)
      }
    }
    titleFileContent = content
  }

  // Aviso (no aborta): mismo criterio que deals/ — un archivo nuevo en title/
  // que el script no conoce pasaría desapercibido.
  const knownTitleFiles = new Set([TITLE_FILE])
  let actualTitleFiles = []
  try {
    actualTitleFiles = fs.readdirSync(TITLE_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${TITLE_DIR_NAME}: ${e.message}`)
  }
  const unknownTitleFiles = actualTitleFiles.filter((f) => !knownTitleFiles.has(f))
  if (unknownTitleFiles.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${TITLE_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownTitleFiles.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/bullet/modulo_bullet.html ----------------
// Fase 3 del plan de nuevos módulos de contenido — ver components/bullet/render.ts.
let bulletFileContent = ''
if (BULLET_DIR) {
  const fp = path.join(BULLET_DIR, BULLET_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BULLET_DIR_NAME}/${BULLET_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(BULLET_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/bullet/render.ts`)
      }
    }
    bulletFileContent = content
  }

  // Aviso (no aborta): mismo criterio que title/.
  const knownBulletFiles = new Set([BULLET_FILE])
  let actualBulletFiles = []
  try {
    actualBulletFiles = fs.readdirSync(BULLET_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BULLET_DIR_NAME}: ${e.message}`)
  }
  const unknownBulletFiles = actualBulletFiles.filter((f) => !knownBulletFiles.has(f))
  if (unknownBulletFiles.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BULLET_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownBulletFiles.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/benefits/modulo-beneficios.html ----------
// Fase 3 del plan de nuevos módulos de contenido — ver components/benefits/render.ts
// + moduleItems/render.ts (BENEFICIOS_TITULO/BENEFICIOS_TEXTO, extraídas de este
// mismo archivo — mismo criterio que TITULO_TEXTO/SUBTITULO_TEXTO con title/).
let beneficiosFileContent = ''
if (BENEFITS_DIR) {
  const fp = path.join(BENEFITS_DIR, BENEFITS_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BENEFITS_DIR_NAME}/${BENEFITS_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(BENEFICIOS_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/benefits/render.ts y moduleItems/render.ts`)
      }
    }
    beneficiosFileContent = content
  }

  // Aviso (no aborta): mismo criterio que title/.
  const knownBeneficiosFiles = new Set([BENEFITS_FILE])
  let actualBeneficiosFiles = []
  try {
    actualBeneficiosFiles = fs.readdirSync(BENEFITS_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BENEFITS_DIR_NAME}: ${e.message}`)
  }
  const unknownBeneficiosFiles = actualBeneficiosFiles.filter((f) => !knownBeneficiosFiles.has(f))
  if (unknownBeneficiosFiles.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BENEFITS_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownBeneficiosFiles.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/1columna/modulo-1columna.html ------------
// Fase 4 del plan de nuevos módulos de contenido — ver components/col1/render.ts.
let col1FileContent = ''
if (COL1_DIR) {
  const fp = path.join(COL1_DIR, COL1_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL1_DIR_NAME}/${COL1_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(COL1_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/col1/render.ts`)
      }
    }
    col1FileContent = content
  }

  // Aviso (no aborta): mismo criterio que title/bullet/benefits.
  const knownCol1Files = new Set([COL1_FILE])
  let actualCol1Files = []
  try {
    actualCol1Files = fs.readdirSync(COL1_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL1_DIR_NAME}: ${e.message}`)
  }
  const unknownCol1Files = actualCol1Files.filter((f) => !knownCol1Files.has(f))
  if (unknownCol1Files.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL1_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownCol1Files.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/3columnas/modulo-3-columnas.html ---------
// Fase 5 del plan de nuevos módulos de contenido — ver components/col3/render.ts.
let col3FileContent = ''
if (COL3_DIR) {
  const fp = path.join(COL3_DIR, COL3_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL3_DIR_NAME}/${COL3_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(COL3_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/col3/render.ts`)
      }
    }
    col3FileContent = content
  }

  // Aviso (no aborta): mismo criterio que title/bullet/benefits/1columna.
  const knownCol3Files = new Set([COL3_FILE])
  let actualCol3Files = []
  try {
    actualCol3Files = fs.readdirSync(COL3_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL3_DIR_NAME}: ${e.message}`)
  }
  const unknownCol3Files = actualCol3Files.filter((f) => !knownCol3Files.has(f))
  if (unknownCol3Files.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL3_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownCol3Files.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/2columnas/modulo-2-columnas.html ---------
// Fase 6 del plan de nuevos módulos de contenido — ver components/col2/render.ts.
let col2FileContent = ''
if (COL2_DIR) {
  const fp = path.join(COL2_DIR, COL2_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL2_DIR_NAME}/${COL2_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(COL2_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/col2/render.ts`)
      }
    }
    col2FileContent = content
  }

  // Aviso (no aborta): mismo criterio que title/bullet/benefits/1columna/3columnas.
  const knownCol2Files = new Set([COL2_FILE])
  let actualCol2Files = []
  try {
    actualCol2Files = fs.readdirSync(COL2_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL2_DIR_NAME}: ${e.message}`)
  }
  const unknownCol2Files = actualCol2Files.filter((f) => !knownCol2Files.has(f))
  if (unknownCol2Files.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL2_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownCol2Files.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/logos/{modulo-logos,grilla3/4/6logos}.html
// Fase 7 del plan de nuevos módulos de contenido — ver components/logos/render.ts.
let logosModuleFileContent = ''
/** `{ [fileName]: content }` — las 3 grillas. */
const logosGridFileContents = {}
if (LOGOS_DIR) {
  const moduleFp = path.join(LOGOS_DIR, LOGOS_MODULE_FILE)
  const moduleLabel = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${LOGOS_DIR_NAME}/${LOGOS_MODULE_FILE}`
  if (!fs.existsSync(moduleFp)) {
    fail(`No se encontró ${moduleLabel} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(moduleFp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(LOGOS_MODULE_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${moduleLabel}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/logos/render.ts`)
      }
    }
    logosModuleFileContent = content
  }

  for (const gridFile of LOGOS_GRID_FILES) {
    const fp = path.join(LOGOS_DIR, gridFile)
    const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${LOGOS_DIR_NAME}/${gridFile}`
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${label} en ${MASTER_DIR}`)
      continue
    }
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(LOGOS_GRID_ANCHOR_COUNTS[gridFile])) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/logos/render.ts`)
      }
    }
    logosGridFileContents[gridFile] = content
  }

  // Aviso (no aborta): mismo criterio que title/bullet/benefits/1columna/2-3columnas.
  const knownLogosFiles = new Set([LOGOS_MODULE_FILE, ...LOGOS_GRID_FILES])
  let actualLogosFiles = []
  try {
    actualLogosFiles = fs.readdirSync(LOGOS_DIR).filter((f) => f.endsWith('.html'))
  } catch (e) {
    fail(`No se pudo leer ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${LOGOS_DIR_NAME}: ${e.message}`)
  }
  const unknownLogosFiles = actualLogosFiles.filter((f) => !knownLogosFiles.has(f))
  if (unknownLogosFiles.length > 0) {
    console.warn(
      `${DIM}⚠ ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${LOGOS_DIR_NAME}/ tiene archivo(s) nuevo(s) sin sincronizar: ${unknownLogosFiles.join(', ')} — revisar si hace falta agregarlos.${RESET}`,
    )
  }
}

// --- NN-components/NN_content-modules/_contenidos_wrapper.html -----------------
// Pedido explícito del usuario 2026-08-31 — ver components/contenidos/render.ts.
let contenidosWrapperFileContent = ''
if (CONTENT_MODULES_DIR) {
  const fp = path.join(CONTENT_MODULES_DIR, CONTENIDOS_WRAPPER_FILE)
  const label = `${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${CONTENIDOS_WRAPPER_FILE}`
  if (!fs.existsSync(fp)) {
    fail(`No se encontró ${label} en ${MASTER_DIR}`)
  } else {
    const content = fs.readFileSync(fp, 'utf8')
    const stripped = content.replace(HTML_COMMENT_RE, '')
    for (const [anchor, expected] of Object.entries(CONTENIDOS_WRAPPER_ANCHOR_COUNTS)) {
      const actual = stripped.split(anchor).length - 1
      if (actual !== expected) {
        fail(`${label}: el ancla "${anchor}" aparece ${actual} veces sin comentarios (se esperaban ${expected}) — revisar components/contenidos/render.ts`)
      }
    }
    contenidosWrapperFileContent = content
  }
}

// --- NN-components/NN_headers/** --------------------------------------------------
// 10 marcas × 4 archivos (fondo × disposición) + el wrapper compartido.
/** `{ [brand]: { [fileName]: content } }`. */
const headerBrandFileContents = {}
let headerWrapperContent = ''
if (HEADERS_DIR) {
  for (const brand of HEADER_BRANDS) {
    const brandFiles = {}
    for (const name of HEADER_VARIANT_FILES) {
      const fp = path.join(HEADERS_DIR, brand, name)
      if (!fs.existsSync(fp)) {
        fail(`No se encontró ${COMPONENTS_DIR_NAME}/${HEADERS_SUBDIR_NAME}/${brand}/${name} en ${MASTER_DIR}`)
        continue
      }
      brandFiles[name] = fs.readFileSync(fp, 'utf8')
    }
    headerBrandFileContents[brand] = brandFiles
  }

  const wrapperPath = path.join(HEADERS_DIR, HEADER_WRAPPER_FILE)
  if (!fs.existsSync(wrapperPath)) {
    fail(`No se encontró ${COMPONENTS_DIR_NAME}/${HEADERS_SUBDIR_NAME}/${HEADER_WRAPPER_FILE} en ${MASTER_DIR}`)
  } else {
    headerWrapperContent = fs.readFileSync(wrapperPath, 'utf8')
    const markerCount = headerWrapperContent.split(HEADER_WRAPPER_MARKER).length - 1
    if (markerCount !== 1) {
      fail(
        `El marcador ${HEADER_WRAPPER_MARKER} aparece ${markerCount} veces en ${COMPONENTS_DIR_NAME}/${HEADERS_SUBDIR_NAME}/${HEADER_WRAPPER_FILE} (se esperaba 1)`,
      )
    }
  }
}

// --- Abortar si hubo cualquier error (sin escribir nada) ------------------------
if (errors.length) {
  console.error(`\n${RED}✗ Validación de contrato fallida — no se sincronizó nada.${RESET}`)
  console.error(`${RED}  La app sigue usando la última versión buena de los assets.${RESET}\n`)
  for (const e of errors) console.error(`  ${RED}•${RESET} ${e}`)
  console.error('')
  process.exit(1)
}

// --- Ensamblar template_base.html con el <head> inyectado ----------------------
let assembledTemplateBaseHtml = templateBaseHtml
for (const { file, placeholder } of FOUNDATIONS_INJECTIONS) {
  assembledTemplateBaseHtml = assembledTemplateBaseHtml.replace(placeholder, foundationsFileContents[file])
}

// --- Escribir todo -------------------------------------------------------------
fs.rmSync(ASSETS_DIR, { recursive: true, force: true })
fs.mkdirSync(ASSETS_DIR, { recursive: true })
fs.writeFileSync(path.join(ASSETS_DIR, TEMPLATE_BASE_FILE), assembledTemplateBaseHtml, 'utf8')
for (const [name, content] of Object.entries(footerFileContents)) {
  fs.writeFileSync(path.join(ASSETS_DIR, name), content, 'utf8')
}
if (cierreFileContent) {
  fs.writeFileSync(path.join(ASSETS_DIR, CIERRE_FILE), cierreFileContent, 'utf8')
}
if (ctaTemplateContent) {
  fs.writeFileSync(path.join(ASSETS_DIR, CTA_FILE), ctaTemplateContent, 'utf8')
}
// Suelto además de inyectado: src/themes/themes.ts parsea los temas de acá.
fs.writeFileSync(path.join(ASSETS_DIR, 'head-meta-tags.html'), headMetaHtml, 'utf8')

const BANNERS_ASSETS_DIR = path.join(ASSETS_DIR, 'banners')
fs.mkdirSync(BANNERS_ASSETS_DIR, { recursive: true })
for (const [name, content] of Object.entries(bannerFileContents)) {
  fs.writeFileSync(path.join(BANNERS_ASSETS_DIR, name), content, 'utf8')
}
const BANNER_MOLECULAS_ASSETS_DIR = path.join(BANNERS_ASSETS_DIR, BANNER_MOLECULAS_DIR_NAME)
fs.mkdirSync(BANNER_MOLECULAS_ASSETS_DIR, { recursive: true })
for (const [name, content] of Object.entries(bannerMoleculaFileContents)) {
  fs.writeFileSync(path.join(BANNER_MOLECULAS_ASSETS_DIR, name), content, 'utf8')
}

if (dealsFileContent) {
  const DEALS_ASSETS_DIR = path.join(ASSETS_DIR, DEALS_DIR_NAME)
  fs.mkdirSync(DEALS_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(DEALS_ASSETS_DIR, DEALS_FILE), dealsFileContent, 'utf8')
}

const CONTENT_MOLECULAS_ASSETS_DIR = path.join(ASSETS_DIR, 'content-modules', CONTENT_MOLECULAS_DIR_NAME)
fs.mkdirSync(CONTENT_MOLECULAS_ASSETS_DIR, { recursive: true })
for (const [name, content] of Object.entries(contentMoleculaFileContents)) {
  fs.writeFileSync(path.join(CONTENT_MOLECULAS_ASSETS_DIR, name), content, 'utf8')
}

if (titleFileContent) {
  const TITLE_ASSETS_DIR = path.join(ASSETS_DIR, TITLE_DIR_NAME)
  fs.mkdirSync(TITLE_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(TITLE_ASSETS_DIR, TITLE_FILE), titleFileContent, 'utf8')
}

if (bulletFileContent) {
  const BULLET_ASSETS_DIR = path.join(ASSETS_DIR, BULLET_DIR_NAME)
  fs.mkdirSync(BULLET_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(BULLET_ASSETS_DIR, BULLET_FILE), bulletFileContent, 'utf8')
}

if (beneficiosFileContent) {
  const BENEFITS_ASSETS_DIR = path.join(ASSETS_DIR, BENEFITS_DIR_NAME)
  fs.mkdirSync(BENEFITS_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(BENEFITS_ASSETS_DIR, BENEFITS_FILE), beneficiosFileContent, 'utf8')
}

if (col1FileContent) {
  const COL1_ASSETS_DIR = path.join(ASSETS_DIR, 'col1')
  fs.mkdirSync(COL1_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(COL1_ASSETS_DIR, COL1_FILE), col1FileContent, 'utf8')
}

if (col3FileContent) {
  const COL3_ASSETS_DIR = path.join(ASSETS_DIR, 'col3')
  fs.mkdirSync(COL3_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(COL3_ASSETS_DIR, COL3_FILE), col3FileContent, 'utf8')
}

if (col2FileContent) {
  const COL2_ASSETS_DIR = path.join(ASSETS_DIR, 'col2')
  fs.mkdirSync(COL2_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(COL2_ASSETS_DIR, COL2_FILE), col2FileContent, 'utf8')
}

if (logosModuleFileContent) {
  const LOGOS_ASSETS_DIR = path.join(ASSETS_DIR, 'logos')
  fs.mkdirSync(LOGOS_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(LOGOS_ASSETS_DIR, LOGOS_MODULE_FILE), logosModuleFileContent, 'utf8')
  for (const [name, content] of Object.entries(logosGridFileContents)) {
    fs.writeFileSync(path.join(LOGOS_ASSETS_DIR, name), content, 'utf8')
  }
}

if (contenidosWrapperFileContent) {
  // Carpeta propia (`contenidos/`) — mismo criterio que title/bullet/benefits:
  // nombre calcado del componente de app/src que lo consume.
  const CONTENIDOS_ASSETS_DIR = path.join(ASSETS_DIR, 'contenidos')
  fs.mkdirSync(CONTENIDOS_ASSETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(CONTENIDOS_ASSETS_DIR, CONTENIDOS_WRAPPER_FILE), contenidosWrapperFileContent, 'utf8')
}

const HEADERS_ASSETS_DIR = path.join(ASSETS_DIR, 'headers')
fs.mkdirSync(HEADERS_ASSETS_DIR, { recursive: true })
fs.writeFileSync(path.join(HEADERS_ASSETS_DIR, HEADER_WRAPPER_FILE), headerWrapperContent, 'utf8')
let headerFileCount = 0
for (const [brand, files] of Object.entries(headerBrandFileContents)) {
  const brandDir = path.join(HEADERS_ASSETS_DIR, brand)
  fs.mkdirSync(brandDir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(brandDir, name), content, 'utf8')
    headerFileCount++
  }
}

console.log(
  `${GREEN}✓${RESET} ${TEMPLATE_BASE_SOURCE} (${SLOT_MARKERS.length} marcadores + tema + HEADER WRAPPER + WRAPPER DE CONTENIDOS + BANNER + 2 inyecciones de ${FOUNDATIONS_DIR_NAME} OK) + ${Object.keys(footerFileContents).length} archivos de ${COMPONENTS_DIR_NAME}/${FOOTER_SUBDIR_NAME}/ + 1 archivo de ${COMPONENTS_DIR_NAME}/${CIERRE_SUBDIR_NAME}/ + 1 archivo de ${COMPONENTS_DIR_NAME}/${CTAS_SUBDIR_NAME}/`,
)
console.log(
  `${GREEN}✓${RESET} ${headerFileCount} archivos de ${COMPONENTS_DIR_NAME}/${HEADERS_SUBDIR_NAME}/ (${HEADER_BRANDS.length} marcas) + ${HEADER_WRAPPER_FILE}`,
)
console.log(
  `${GREEN}✓${RESET} ${Object.keys(bannerFileContents).length + Object.keys(bannerMoleculaFileContents).length} archivos de ${COMPONENTS_DIR_NAME}/${BANNERS_SUBDIR_NAME}/`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${DEALS_DIR_NAME}/ (${Object.keys(DEALS_ANCHOR_COUNTS).length} anclas OK)`,
)
console.log(
  `${GREEN}✓${RESET} ${Object.keys(contentMoleculaFileContents).length} archivo(s) de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${CONTENT_MOLECULAS_DIR_NAME}/ (${CONTENT_MOLECULAS_KNOWN_PENDING_FILES.length} más listados, pendientes de fases futuras)`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${TITLE_DIR_NAME}/ (${Object.keys(TITLE_ANCHOR_COUNTS).length} anclas OK)`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BULLET_DIR_NAME}/ (${Object.keys(BULLET_ANCHOR_COUNTS).length} anclas OK)`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${BENEFITS_DIR_NAME}/ (${Object.keys(BENEFICIOS_ANCHOR_COUNTS).length} anclas OK)`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL1_DIR_NAME}/ (${Object.keys(COL1_ANCHOR_COUNTS).length} anclas OK)`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL3_DIR_NAME}/ (${Object.keys(COL3_ANCHOR_COUNTS).length} anclas OK)`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${COL2_DIR_NAME}/ (${Object.keys(COL2_ANCHOR_COUNTS).length} anclas OK)`,
)
console.log(
  `${GREEN}✓${RESET} ${1 + LOGOS_GRID_FILES.length} archivos de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${LOGOS_DIR_NAME}/ (${Object.keys(LOGOS_MODULE_ANCHOR_COUNTS).length} anclas del shell OK + ${LOGOS_GRID_FILES.length} grillas OK)`,
)
console.log(
  `${GREEN}✓${RESET} 1 archivo de ${COMPONENTS_DIR_NAME}/${CONTENT_MODULES_SUBDIR_NAME}/${CONTENIDOS_WRAPPER_FILE} (${Object.keys(CONTENIDOS_WRAPPER_ANCHOR_COUNTS).length} anclas OK)`,
)
if (themesMissingColorFooter.length === themeCount) {
  console.warn(
    `${DIM}⚠ Ningún tema define color_footer_mail_general en head-meta-tags.html — usando el fallback por grupo de themes.ts (ver nota en el encabezado de este script).${RESET}`,
  )
} else if (themesMissingColorFooter.length > 0) {
  console.warn(
    `${DIM}⚠ ${themesMissingColorFooter.length}/${themeCount} temas sin color_footer_mail_general (${themesMissingColorFooter.join(', ')}) — usando el fallback de themes.ts para esos.${RESET}`,
  )
} else {
  console.log(`${GREEN}✓${RESET} ${themeCount} temas con color_footer_mail_general OK`)
}
console.log(`${GREEN}✓ sync-master OK${RESET}`)
