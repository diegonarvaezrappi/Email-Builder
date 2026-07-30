import templateBaseRaw from '../assets/templates/template_base.html?raw'
import { SLOT_ORDER, type EmailDocument, type SlotName } from '../model'
import { registry } from '../registry'
import { inlineTheme } from '../themes/inlineTheme'
import { resolveGlobalVars } from '../global/vars'

/**
 * El maestro no trae un `<!-- HEADER -->` de una sola línea como los demás
 * slots: HEADER vive como el comentario multilínea "HEADER WRAPPER … CIERRE
 * HEADER WRAPPER" (ver 06-examples/test_claude_1_original.html). Regex no
 * codiciosa, mismo estilo que THEME_IF_RE en themes/inlineTheme.ts. Debe
 * quedar sincronizado con HEADER_WRAPPER_PLACEHOLDER_RE de
 * scripts/sync-master.mjs, que valida esta misma forma antes de sincronizar.
 */
const HEADER_WRAPPER_PLACEHOLDER_RE = /<!--\s*HEADER WRAPPER[\s\S]*?CIERRE HEADER WRAPPER\s*-->/

/**
 * Slots cuyo marcador real no es `<!-- ${slot} -->` literal. El maestro
 * (estructura_general.html) usa el plural "CIERRES" para el slot Cierre —
 * inconsistencia real del repo, no un typo de acá. Debe quedar sincronizado
 * con SLOT_MARKERS de scripts/sync-master.mjs, que valida esta misma forma
 * antes de sincronizar.
 */
const SLOT_MARKER_TEXT: Partial<Record<SlotName, string>> = {
  CIERRE: 'CIERRES',
}

/**
 * Ensambla el HTML final de un email: toma template_base.html (sincronizado
 * por scripts/sync-master.mjs), deja el tema ya resuelto y reemplaza, por
 * string literal, cada marcador de slot que tenga una entrada en el registry.
 * Los marcadores sin componente implementado quedan intactos.
 *
 * Reemplazo literal (no DOMParser) a propósito: preserva el Liquid+HTML del
 * template maestro byte a byte — ver decisión de arquitectura en el plan.
 */
export function assembleEmailHtml(doc: EmailDocument): string {
  // El tema no se deja como Liquid: sus variables salen con el valor puesto y
  // las 11 ramas condicionales se borran, así el HTML para Braze va limpio.
  let html = inlineTheme(templateBaseRaw, resolveGlobalVars(doc.global))

  for (const slot of SLOT_ORDER) {
    const def = registry[slot]
    if (!def) continue

    const fields = doc[def.docKey]
    const rendered = def.render(fields, doc)

    if (slot === 'HEADER') {
      if (!HEADER_WRAPPER_PLACEHOLDER_RE.test(html)) {
        throw new Error('No se encontró el placeholder "HEADER WRAPPER" en template_base.html')
      }
      html = html.replace(HEADER_WRAPPER_PLACEHOLDER_RE, rendered)
      continue
    }

    const marker = `<!-- ${SLOT_MARKER_TEXT[slot] ?? slot} -->`
    if (!html.includes(marker)) {
      throw new Error(`No se encontró el marcador ${marker} en template_base.html`)
    }
    html = html.replace(marker, rendered)
  }

  return html
}
