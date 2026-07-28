// ============================================================================
// sync-master.mjs — Sincroniza los archivos maestro (repo jarvis-mail-system) → assets
// ----------------------------------------------------------------------------
// 1. Toma el maestro con placeholders y le inyecta, por reemplazo literal, el
//    contenido de 01-foundations/global-styles/ (head-meta-tags.html y
//    global-styles.html) en sus dos puntos de inserción — así el <head> real
//    vive en un solo lugar (01-foundations) en vez de estar hardcodeado
//    dentro del maestro.
// 2. Copia 03-components/footer/*.html → src/assets/templates/ tal cual.
// 3. VALIDA el contrato antes de escribir nada:
//    - Los 4 marcadores de slot ya implementables como componente
//      (BANNER, CONTENIDOS, CIERRE, FOOTER) deben aparecer EXACTAMENTE una
//      vez en el maestro. HEADER queda fuera de este chequeo: en el maestro
//      vive como el comentario multilínea "HEADER WRAPPER" (todavía no hay
//      componente de header implementado en registry.ts).
//    - Los 2 placeholders de 01-foundations deben aparecer EXACTAMENTE una
//      vez cada uno.
//    Si algo falla → aborta SIN escribir nada, y la app conserva la última
//    copia buena de los assets.
//
// NOTA: el repo jarvis-mail-system es solo contenido (fuente de verdad de
// diseño), este script solo LEE de él — nunca escribe ni modifica nada ahí.
// El maestro con placeholders vive ahora en 07-examples/test_claude_1_original.html
// (antes era template_base.html en la raíz del viejo EMAIL-BUILDER) y los
// footers en 03-components/footer/ (antes Footer/).
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
const FOUNDATIONS_DIR = path.join(MASTER_DIR, '01-foundations', 'global-styles')
const FOOTER_DIR = path.join(MASTER_DIR, '03-components', 'footer')

const RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m', RESET = '\x1b[0m'
const errors = []
const fail = (msg) => errors.push(msg)

const SLOT_MARKERS = ['BANNER', 'CONTENIDOS', 'CIERRE', 'FOOTER']

const TEMPLATE_BASE_SOURCE = path.join('07-examples', 'test_claude_1_original.html')
const TEMPLATE_BASE_FILE = 'template_base.html'
const FOOTER_FILES = ['footer.html', 'footer_general.html', 'footer_rts.html', 'footer_sinamor.html']

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
const templateBasePath = path.join(MASTER_DIR, TEMPLATE_BASE_SOURCE)
let templateBaseHtml = ''
if (!fs.existsSync(templateBasePath)) {
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
}

// --- 01-foundations/global-styles: leer + validar placeholders -----------------
const foundationsFileContents = {}
if (templateBaseHtml) {
  for (const { file, placeholder } of FOUNDATIONS_INJECTIONS) {
    const fp = path.join(FOUNDATIONS_DIR, file)
    if (!fs.existsSync(fp)) {
      fail(`No se encontró 01-foundations/global-styles/${file}`)
      continue
    }
    foundationsFileContents[file] = fs.readFileSync(fp, 'utf8')

    const count = templateBaseHtml.split(placeholder).length - 1
    if (count !== 1) {
      fail(`El placeholder de ${file} aparece ${count} veces en ${TEMPLATE_BASE_SOURCE} (se esperaba 1)`)
    }
  }
}

// --- 03-components/footer/*.html ------------------------------------------------
const footerFileContents = {}
for (const name of FOOTER_FILES) {
  const fp = path.join(FOOTER_DIR, name)
  if (!fs.existsSync(fp)) {
    fail(`No se encontró 03-components/footer/${name} en ${MASTER_DIR}`)
    continue
  }
  footerFileContents[name] = fs.readFileSync(fp, 'utf8')
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

console.log(
  `${GREEN}✓${RESET} ${TEMPLATE_BASE_SOURCE} (${SLOT_MARKERS.length} marcadores + 2 inyecciones de 01-foundations OK) + ${Object.keys(footerFileContents).length} archivos de 03-components/footer/`,
)
console.log(`${GREEN}✓ sync-master OK${RESET}`)
