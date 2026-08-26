// ============================================================================
// Los renders NUEVOS de fase 2 (TITULO_TEXTO/SUBTITULO_TEXTO/SEPARADOR_LINEA) y
// fase 3 (BULLET_ICONO/BULLET_NUMERADO/ICONO/BENEFICIOS_TITULO/BENEFICIOS_TEXTO
// — ver moduleItems/schemas.ts sobre por qué los otros 3 tipos del catálogo se
// REUSAN de components/banner/items/render.ts en vez de vivir acá).
//
// TITULO_TEXTO y SUBTITULO_TEXTO cargan modulo-titulo.html directo (mismo
// archivo que components/title/render.ts usa para el SHELL del módulo) y
// recortan su propio fragmento (el `<h2>`/`<h3>`) por ancla literal — el shell
// no sabe nada de estos 2 tags puntuales, solo vacía el `<div>` que los
// contenía y lo rellena con lo que sea que fields.items tenga (ver
// innerBounds en template/htmlEdits.ts). SEPARADOR_LINEA carga su propio
// archivo dedicado (content_moleculas/molecula_separador_s.html) — no hace
// falta recortar nada, se devuelve tal cual sin comentarios.
//
// BENEFICIOS_TITULO/BENEFICIOS_TEXTO siguen el mismo patrón que TITULO_TEXTO/
// SUBTITULO_TEXTO: cargan modulo-beneficios.html directo (mismo archivo que
// components/benefits/render.ts usa para el SHELL) y recortan su propio
// fragmento por ancla literal. BULLET_ICONO/BULLET_NUMERADO/ICONO cargan sus
// propios archivos dedicados de content_moleculas/ — ver el detalle en cada
// sección.
// ============================================================================
import titleModuleRaw from '../assets/templates/title/modulo-titulo.html?raw'
import separadorLineaRaw from '../assets/templates/content-modules/content_moleculas/molecula_separador_s.html?raw'
import bulletIconoSRaw from '../assets/templates/content-modules/content_moleculas/molecula_bullet_icono_s.html?raw'
import bulletIconoMRaw from '../assets/templates/content-modules/content_moleculas/molecula_bullet_icono_m.html?raw'
import bulletIconoLRaw from '../assets/templates/content-modules/content_moleculas/molecula_bullet_icono_l.html?raw'
import bulletNumeradoRaw from '../assets/templates/content-modules/content_moleculas/molecula_bullet_numerado.html?raw'
import iconoRaw from '../assets/templates/content-modules/content_moleculas/molecula_icono.html?raw'
import beneficiosModuleRaw from '../assets/templates/benefits/modulo-beneficios.html?raw'
import { escapeHtmlText, substituteImgSrcOrRemove } from '../template/htmlText'
import { applyEdits, elementBounds, indexOfOrThrow, textRunBounds, voidElementBounds } from '../template/htmlEdits'
import type {
  BeneficiosTextoFields,
  BeneficiosTituloFields,
  BulletIconoFields,
  BulletIconoSize,
  BulletNumeradoFields,
  IconoFields,
  IconoSize,
  SeparadorLineaFields,
  SubtituloTextoFields,
  TituloTextoFields,
} from './schemas'

const TITLE_FILE_NAME = 'modulo-titulo.html'

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
function stripComments(html: string): string {
  return html.replace(HTML_COMMENT_RE, '')
}

// --- TITULO_TEXTO --------------------------------------------------------------

const TITULO_TEXTO_LITERAL = '>Titulo<'

export function renderTituloTextoSnippet(fields: TituloTextoFields): string {
  const raw = stripComments(titleModuleRaw)
  const literalIndex = indexOfOrThrow(raw, TITULO_TEXTO_LITERAL, TITLE_FILE_NAME)
  const bounds = elementBounds(raw, literalIndex, 'h2', TITLE_FILE_NAME)
  const template = raw.slice(bounds.start, bounds.end)
  const textBounds = textRunBounds(template, { start: 0, end: template.length }, 'h2', TITLE_FILE_NAME)
  return template.slice(0, textBounds.start) + escapeHtmlText(fields.text) + template.slice(textBounds.end)
}

// --- SUBTITULO_TEXTO -------------------------------------------------------------

const SUBTITULO_TEXTO_LITERAL = 'bloque de texto bloque de texto bloque de texto'

export function renderSubtituloTextoSnippet(fields: SubtituloTextoFields): string {
  const raw = stripComments(titleModuleRaw)
  const literalIndex = indexOfOrThrow(raw, SUBTITULO_TEXTO_LITERAL, TITLE_FILE_NAME)
  const bounds = elementBounds(raw, literalIndex, 'h3', TITLE_FILE_NAME)
  const template = raw.slice(bounds.start, bounds.end)
  const textBounds = textRunBounds(template, { start: 0, end: template.length }, 'h3', TITLE_FILE_NAME)
  return template.slice(0, textBounds.start) + escapeHtmlText(fields.text) + template.slice(textBounds.end)
}

// --- SEPARADOR_LINEA -------------------------------------------------------------
// Sin campos: se devuelve el archivo (sin comentarios) tal cual. Los 2
// `{{...}}` que trae ({{color_acento1_mail_general}}, {{alineado_molecular_mail_body}})
// quedan para la pasada de tema y de alineado del módulo dueño, respectivamente.

export function renderSeparadorLineaSnippet(_fields: SeparadorLineaFields): string {
  return stripComments(separadorLineaRaw)
}

// --- BULLET_ICONO ----------------------------------------------------------------
// Los 3 archivos comparten el mismo par de literales de título/texto — un solo
// helper de edición, solo cambia CUÁL archivo se carga según `fields.size`.

const BULLET_ICONO_RAW: Record<BulletIconoSize, string> = { S: bulletIconoSRaw, M: bulletIconoMRaw, L: bulletIconoLRaw }
const BULLET_ICONO_FILE_NAME: Record<BulletIconoSize, string> = {
  S: 'molecula_bullet_icono_s.html',
  M: 'molecula_bullet_icono_m.html',
  L: 'molecula_bullet_icono_l.html',
}
const BULLET_TITULO_LITERAL = '>Subtitulo<'
const BULLET_TEXTO_LITERAL = 'bloque de texto bloque de texto bloque de texto'

export function renderBulletIconoSnippet(fields: BulletIconoFields): string {
  const fileName = BULLET_ICONO_FILE_NAME[fields.size]
  const raw = stripComments(BULLET_ICONO_RAW[fields.size])

  const tituloIndex = indexOfOrThrow(raw, BULLET_TITULO_LITERAL, fileName)
  const tituloBounds = elementBounds(raw, tituloIndex, 'h3', fileName)
  const tituloTextBounds = textRunBounds(raw, tituloBounds, 'h3', fileName)

  const textoIndex = indexOfOrThrow(raw, BULLET_TEXTO_LITERAL, fileName)
  const textoBounds = elementBounds(raw, textoIndex, 'h4', fileName)
  const textoTextBounds = textRunBounds(raw, textoBounds, 'h4', fileName)

  return applyEdits(
    raw,
    [
      { ...tituloTextBounds, replacement: escapeHtmlText(fields.titulo) },
      { ...textoTextBounds, replacement: escapeHtmlText(fields.texto) },
    ],
    fileName,
  )
}

// --- BULLET_NUMERADO -------------------------------------------------------------
// Mismo par título/texto que BULLET_ICONO + el número de fábrica (' 1 ', un
// <h4> aparte del de texto — se busca por SU propio literal, con espacios, así
// no colisiona con el otro <h4> del mismo archivo).

const BULLET_NUMERADO_FILE_NAME = 'molecula_bullet_numerado.html'
const BULLET_NUMERADO_NUMERO_LITERAL = '> 1 <'

export function renderBulletNumeradoSnippet(fields: BulletNumeradoFields): string {
  const raw = stripComments(bulletNumeradoRaw)

  const numeroIndex = indexOfOrThrow(raw, BULLET_NUMERADO_NUMERO_LITERAL, BULLET_NUMERADO_FILE_NAME)
  const numeroBounds = elementBounds(raw, numeroIndex, 'h4', BULLET_NUMERADO_FILE_NAME)
  const numeroTextBounds = textRunBounds(raw, numeroBounds, 'h4', BULLET_NUMERADO_FILE_NAME)

  const tituloIndex = indexOfOrThrow(raw, BULLET_TITULO_LITERAL, BULLET_NUMERADO_FILE_NAME)
  const tituloBounds = elementBounds(raw, tituloIndex, 'h3', BULLET_NUMERADO_FILE_NAME)
  const tituloTextBounds = textRunBounds(raw, tituloBounds, 'h3', BULLET_NUMERADO_FILE_NAME)

  const textoIndex = indexOfOrThrow(raw, BULLET_TEXTO_LITERAL, BULLET_NUMERADO_FILE_NAME)
  const textoBounds = elementBounds(raw, textoIndex, 'h4', BULLET_NUMERADO_FILE_NAME)
  const textoTextBounds = textRunBounds(raw, textoBounds, 'h4', BULLET_NUMERADO_FILE_NAME)

  return applyEdits(
    raw,
    [
      { ...numeroTextBounds, replacement: escapeHtmlText(fields.numero) },
      { ...tituloTextBounds, replacement: escapeHtmlText(fields.titulo) },
      { ...textoTextBounds, replacement: escapeHtmlText(fields.texto) },
    ],
    BULLET_NUMERADO_FILE_NAME,
  )
}

// --- ICONO -------------------------------------------------------------------
// molecula_icono.html: un solo archivo de referencia con 4 `<img>` alternativos
// (S/M/L/XL) — se ubica el que corresponde por su propio `role`, se le
// reescribe el border-radius (regex ACOTADO al fragmento ya aislado del propio
// <img>, no al documento entero — L/XL ya traen "border-radius: 7px;" en su
// style, S/M no traen ninguno, así que "sacar y opcionalmente reponer" cubre
// los 2 casos con el mismo código) y por último la URL — en ese orden, mismo
// motivo que IMG_AUTOMATICA_MOLECULA/MODULO en components/banner/items/render.ts:
// con imageUrl en blanco, substituteImgSrcOrRemove borra el <img> ENTERO.

const ICONO_FILE_NAME = 'molecula_icono.html'
const ICONO_ROLE: Record<IconoSize, string> = {
  S: 'role="molecula-iconoS"',
  M: 'role="molecula-iconoM"',
  L: 'role="molecula-iconoL"',
  XL: 'role="molecula-iconoXL"',
}
const ICONO_URL_PLACEHOLDER: Record<IconoSize, string> = {
  S: 'https://lh3.googleusercontent.com/d/1wZxPSRbT-maSuZWDyZz99Ewi2A2RH37-',
  M: 'https://lh3.googleusercontent.com/d/1vdunOvDi3k-LLdfUwk2Qpotyl9u7ionz',
  L: 'https://lh3.googleusercontent.com/d/1ZYWddltBXkpcjXzkdlT2fqWSSR2HYB-j',
  XL: 'https://lh3.googleusercontent.com/d/1OnoMAEG3mWUinKdMpWpqQ9lt4s3a8tiS',
}
const ICONO_BORDER_RADIUS_RE = /border-radius:\s*[^;]+;\s*/
const ICONO_BORDER_RADIUS = '7px'

export function renderIconoSnippet(fields: IconoFields): string {
  const raw = stripComments(iconoRaw)
  const roleIndex = indexOfOrThrow(raw, ICONO_ROLE[fields.size], ICONO_FILE_NAME)
  const bounds = voidElementBounds(raw, roleIndex, 'img', ICONO_FILE_NAME)

  // El archivo trae los 4 tamaños como referencia en UNA sola lista — el
  // resultado es SOLO el fragmento del `<img>` elegido, no el archivo entero
  // (a diferencia de BULLET_ICONO/BULLET_NUMERADO, cuyo archivo YA es una sola
  // molécula completa).
  let imgTag = raw.slice(bounds.start, bounds.end).replace(ICONO_BORDER_RADIUS_RE, '')
  if (fields.borderRadiusEnabled) {
    imgTag = imgTag.replace('style="', `style="border-radius: ${ICONO_BORDER_RADIUS}; `)
  }

  return substituteImgSrcOrRemove(imgTag, ICONO_URL_PLACEHOLDER[fields.size], fields.imageUrl, ICONO_FILE_NAME)
}

// --- BENEFICIOS_TITULO / BENEFICIOS_TEXTO -----------------------------------------
// Mismo patrón que TITULO_TEXTO/SUBTITULO_TEXTO: cargan el archivo del SHELL
// (modulo-beneficios.html, el mismo que components/benefits/render.ts usa) y
// recortan su propio fragmento por ancla literal — el shell no sabe nada de
// estos 2 tags puntuales, solo vacía la celda 2 y la rellena con lo que sea
// que fields.items tenga.

const BENEFITS_FILE_NAME = 'modulo-beneficios.html'
const BENEFICIOS_TITULO_LITERAL = '>Descuentos de hasta xxx<'
const BENEFICIOS_TEXTO_LITERAL = 'En todos tus pedidos en la app, pidiendo desde $XXXXXX'

export function renderBeneficiosTituloSnippet(fields: BeneficiosTituloFields): string {
  const raw = stripComments(beneficiosModuleRaw)
  const literalIndex = indexOfOrThrow(raw, BENEFICIOS_TITULO_LITERAL, BENEFITS_FILE_NAME)
  const bounds = elementBounds(raw, literalIndex, 'h3', BENEFITS_FILE_NAME)
  const template = raw.slice(bounds.start, bounds.end)
  const textBounds = textRunBounds(template, { start: 0, end: template.length }, 'h3', BENEFITS_FILE_NAME)
  return template.slice(0, textBounds.start) + escapeHtmlText(fields.text) + template.slice(textBounds.end)
}

export function renderBeneficiosTextoSnippet(fields: BeneficiosTextoFields): string {
  const raw = stripComments(beneficiosModuleRaw)
  const literalIndex = indexOfOrThrow(raw, BENEFICIOS_TEXTO_LITERAL, BENEFITS_FILE_NAME)
  const bounds = elementBounds(raw, literalIndex, 'h4', BENEFITS_FILE_NAME)
  const template = raw.slice(bounds.start, bounds.end)
  const textBounds = textRunBounds(template, { start: 0, end: template.length }, 'h4', BENEFITS_FILE_NAME)
  return template.slice(0, textBounds.start) + escapeHtmlText(fields.text) + template.slice(textBounds.end)
}
