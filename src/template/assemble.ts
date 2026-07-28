import templateBaseRaw from '../assets/templates/template_base.html?raw'
import { SLOT_ORDER, type EmailDocument } from '../model'
import { registry } from '../registry'

/**
 * El `{% assign tema_general_mail_general = '...' %}` de la primera línea del
 * maestro. Debe quedar sincronizado con TEMA_ASSIGN_RE de
 * scripts/sync-master.mjs, que valida que aparezca exactamente una vez.
 */
const TEMA_ASSIGN_RE = /\{%\s*assign\s+tema_general_mail_general\s*=\s*'[^']*'\s*%\}/

/**
 * Ensambla el HTML final de un email: toma template_base.html (sincronizado
 * por scripts/sync-master.mjs), fija el tema global y reemplaza, por string
 * literal, cada marcador de slot que tenga una entrada en el registry. Los
 * marcadores sin componente implementado quedan intactos.
 *
 * Reemplazo literal (no DOMParser) a propósito: preserva el Liquid+HTML del
 * template maestro byte a byte — ver decisión de arquitectura en el plan.
 */
export function assembleEmailHtml(doc: EmailDocument): string {
  let html = templateBaseRaw

  // El tema es global: se reescribe el assign del maestro, no un marcador.
  // De ahí en adelante todo el email lo consume vía las variables *_mail_general.
  if (!TEMA_ASSIGN_RE.test(html)) {
    throw new Error("No se encontró el {% assign tema_general_mail_general = '...' %} en template_base.html")
  }
  html = html.replace(TEMA_ASSIGN_RE, `{% assign tema_general_mail_general = '${doc.global.tema}' %}`)

  for (const slot of SLOT_ORDER) {
    const def = registry[slot]
    if (!def) continue

    const marker = `<!-- ${slot} -->`
    const fields = doc[def.docKey]
    const rendered = def.render(fields, doc)

    if (!html.includes(marker)) {
      throw new Error(`No se encontró el marcador ${marker} en template_base.html`)
    }
    html = html.replace(marker, rendered)
  }

  return html
}
