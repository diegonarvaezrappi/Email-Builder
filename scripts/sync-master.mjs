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
// 4. VALIDA el contrato antes de escribir nada:
//    - Los 4 marcadores de slot ya implementables como componente
//      (BANNER, CONTENIDOS, CIERRE, FOOTER) deben aparecer EXACTAMENTE una
//      vez en el maestro.
//    - El placeholder de HEADER es distinto (vive como el comentario
//      multilínea "HEADER WRAPPER … CIERRE HEADER WRAPPER", no un
//      `<!-- HEADER -->` de una sola línea) y se valida aparte, con el mismo
//      regex que usa src/template/assemble.ts para reemplazarlo.
//    - Los 2 placeholders de NN-foundations deben aparecer EXACTAMENTE una
//      vez cada uno.
//    - El `{% assign tema_general_mail_general = '...' %}` del maestro debe
//      aparecer EXACTAMENTE una vez (template/assemble.ts lo reescribe con el
//      tema elegido).
//    - head-meta-tags.html debe declarar al menos un tema, y CADA tema debe
//      definir su `color_footer_mail_general` (de ahí sale el font_style_look
//      del footer).
//    Si algo falla → aborta SIN escribir nada, y la app conserva la última
//    copia buena de los assets.
//
// NOTA: el repo jarvis-mail-system es solo contenido (fuente de verdad de
// diseño), este script solo LEE de él — nunca escribe ni modifica nada ahí.
//
// Las carpetas se resuelven por NOMBRE, ignorando el prefijo numérico: el repo
// renumera seguido (los ejemplos fueron 08- → 07- → 06- y los componentes
// 03- → 02- en un mismo día), y hardcodear el número rompía el sync en cada
// renumeración. Ver resolveNumberedDir().
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

const FOUNDATIONS_DIR_NAME = resolveNumberedDir('foundations')
const COMPONENTS_DIR_NAME = resolveNumberedDir('components')
const EXAMPLES_DIR_NAME = resolveNumberedDir('examples')

const FOUNDATIONS_DIR = FOUNDATIONS_DIR_NAME && path.join(MASTER_DIR, FOUNDATIONS_DIR_NAME, 'global-styles')
const FOOTER_DIR = COMPONENTS_DIR_NAME && path.join(MASTER_DIR, COMPONENTS_DIR_NAME, 'footer')
const HEADERS_DIR = COMPONENTS_DIR_NAME && path.join(MASTER_DIR, COMPONENTS_DIR_NAME, 'headers')

const SLOT_MARKERS = ['BANNER', 'CONTENIDOS', 'CIERRE', 'FOOTER']

const TEMPLATE_BASE_NAME = 'test_claude_1_original.html'
/** Ruta relativa al repo, solo para los mensajes. */
const TEMPLATE_BASE_SOURCE = path.join(EXAMPLES_DIR_NAME ?? 'NN-examples', TEMPLATE_BASE_NAME)
const TEMPLATE_BASE_FILE = 'template_base.html'
const FOOTER_FILES = ['footer.html', 'footer_general.html', 'footer_rts.html', 'footer_sinamor.html']

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
  },
  {
    file: 'global-styles.html',
    placeholder: '<!--en este espacio se llama: global-styles.html con todo el head y css   -->',
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
  for (const marker of SLOT_MARKERS) {
    const re = new RegExp(`<!--\\s*${marker}\\s*-->`, 'g')
    const matches = templateBaseHtml.match(re) ?? []
    if (matches.length !== 1) {
      fail(`El marcador <!-- ${marker} --> aparece ${matches.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`)
    }
  }

  const temaAssigns = templateBaseHtml.match(TEMA_ASSIGN_RE) ?? []
  if (temaAssigns.length !== 1) {
    fail(
      `El {% assign tema_general_mail_general = '...' %} aparece ${temaAssigns.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`,
    )
  }

  const headerPlaceholders = templateBaseHtml.match(HEADER_WRAPPER_PLACEHOLDER_RE) ?? []
  if (headerPlaceholders.length !== 1) {
    fail(
      `El placeholder "HEADER WRAPPER … CIERRE HEADER WRAPPER" aparece ${headerPlaceholders.length} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`,
    )
  }
}

// --- NN-foundations/global-styles: leer + validar placeholders -----------------
const foundationsFileContents = {}
if (templateBaseHtml && FOUNDATIONS_DIR) {
  for (const { file, placeholder } of FOUNDATIONS_INJECTIONS) {
    const fp = path.join(FOUNDATIONS_DIR, file)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${FOUNDATIONS_DIR_NAME}/global-styles/${file}`)
      continue
    }
    foundationsFileContents[file] = fs.readFileSync(fp, 'utf8')

    const count = templateBaseHtml.split(placeholder).length - 1
    if (count !== 1) {
      fail(`El placeholder de ${file} aparece ${count} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`)
    }
  }
}

// --- head-meta-tags.html: validar que los temas estén completos ------------------
// Cada rama del {% if tema_general_mail_general == '...' %} debe asignar su
// color_footer_mail_general; si falta en alguna, el footer de ese tema saldría
// sin estilo y es mejor enterarse acá que en producción.
const headMetaHtml = foundationsFileContents['head-meta-tags.html']
let themeCount = 0
if (headMetaHtml) {
  const branches = [...headMetaHtml.matchAll(THEME_BRANCH_RE)]
  themeCount = branches.length
  if (themeCount === 0) {
    fail('head-meta-tags.html no declara ningún tema (no se encontró tema_general_mail_general == \'...\')')
  }
  for (const [i, branch] of branches.entries()) {
    const chunk = headMetaHtml.slice(branch.index, branches[i + 1]?.index ?? headMetaHtml.length)
    if (!COLOR_FOOTER_RE.test(chunk)) {
      fail(`El tema '${branch[1]}' no define color_footer_mail_general en head-meta-tags.html`)
    }
  }
}

// --- NN-components/footer/*.html -------------------------------------------------
const footerFileContents = {}
if (FOOTER_DIR) {
  for (const name of FOOTER_FILES) {
    const fp = path.join(FOOTER_DIR, name)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró ${COMPONENTS_DIR_NAME}/footer/${name} en ${MASTER_DIR}`)
      continue
    }
    footerFileContents[name] = fs.readFileSync(fp, 'utf8')
  }
}

// --- NN-components/headers/** ----------------------------------------------------
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
        fail(`No se encontró ${COMPONENTS_DIR_NAME}/headers/${brand}/${name} en ${MASTER_DIR}`)
        continue
      }
      brandFiles[name] = fs.readFileSync(fp, 'utf8')
    }
    headerBrandFileContents[brand] = brandFiles
  }

  const wrapperPath = path.join(HEADERS_DIR, HEADER_WRAPPER_FILE)
  if (!fs.existsSync(wrapperPath)) {
    fail(`No se encontró ${COMPONENTS_DIR_NAME}/headers/${HEADER_WRAPPER_FILE} en ${MASTER_DIR}`)
  } else {
    headerWrapperContent = fs.readFileSync(wrapperPath, 'utf8')
    const markerCount = headerWrapperContent.split(HEADER_WRAPPER_MARKER).length - 1
    if (markerCount !== 1) {
      fail(
        `El marcador ${HEADER_WRAPPER_MARKER} aparece ${markerCount} veces en ${COMPONENTS_DIR_NAME}/headers/${HEADER_WRAPPER_FILE} (se esperaba 1)`,
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
// Suelto además de inyectado: src/themes/themes.ts parsea los temas de acá.
fs.writeFileSync(path.join(ASSETS_DIR, 'head-meta-tags.html'), headMetaHtml, 'utf8')

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
  `${GREEN}✓${RESET} ${TEMPLATE_BASE_SOURCE} (${SLOT_MARKERS.length} marcadores + tema + HEADER WRAPPER + 2 inyecciones de ${FOUNDATIONS_DIR_NAME} OK) + ${Object.keys(footerFileContents).length} archivos de ${COMPONENTS_DIR_NAME}/footer/`,
)
console.log(
  `${GREEN}✓${RESET} ${headerFileCount} archivos de ${COMPONENTS_DIR_NAME}/headers/ (${HEADER_BRANDS.length} marcas) + ${HEADER_WRAPPER_FILE}`,
)
console.log(`${GREEN}✓${RESET} ${themeCount} temas con color_footer_mail_general OK`)
console.log(`${GREEN}✓ sync-master OK${RESET}`)
