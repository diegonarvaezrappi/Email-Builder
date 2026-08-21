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
// 3b. Copia NN-components/banners/big-banner-{horizontal,vertical}.html + 17
//    de los 22 archivos de banners/banner_moleculas/ → src/assets/templates/banners/,
//    preservando la subcarpeta — ver src/components/banner/shell.ts (que
//    parsea los 2 shells) y src/components/banner/items/render.ts (que carga
//    las 17 piezas vía import.meta.glob). Los 4 archivos excluidos a
//    propósito (2 duplicados byte a byte, 2 que son solo un content-block de
//    CTA) están documentados junto a BANNER_MOLECULA_FILES más abajo; el 5to
//    archivo real (molecula_texto_pastilla.html) queda sin sincronizar porque
//    todavía no se decidió si agregarlo como pieza — el warning de "archivo
//    nuevo sin sincronizar" más abajo lo recuerda en cada corrida.
// 3c. Copia NN-components/NN_content-modules/deals/deal_columnas.html →
//    src/assets/templates/deals/ — ver src/components/deals/render.ts, que lo
//    carga y arma con él los pares de tarjetas de deal. Los 2 archivos
//    hermanos (deal-large.backup.html / deal-small.backup.html) quedan fuera a
//    propósito: 02-components/README.md los declara retirados ("ya no se usan
//    en el sistema... no están enlazados desde ningún template") y además
//    modelan otra cosa (un deal único de motor de recomendación, con variables
//    smalldeal_*/deal_recommendation_* y legales por país), no el par de
//    tarjetas de copy manual que implementa la app.
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
 * Las 17 piezas que la app importa de banner_moleculas/ (22 archivos reales).
 * Quedan FUERA a propósito 4 de los 22 (+ 1 más, ver nota arriba sobre
 * molecula_texto_pastilla.html):
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

/** El único archivo de deals/ que la app usa (ver la nota 3c del encabezado
 *  sobre los 2 .backup.html excluidos). */
const DEALS_FILE = 'deal_columnas.html'

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
const DEALS_COMMENT_RE = /<!--[\s\S]*?-->/g
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
    const stripped = content.replace(DEALS_COMMENT_RE, '')
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
