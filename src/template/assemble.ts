import templateBaseRaw from '../assets/templates/template_base.html?raw'
import { SLOT_ORDER, type EmailDocument } from '../model'
import { registry } from '../registry'
import { inlineTheme } from '../themes/inlineTheme'

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
  let html = inlineTheme(templateBaseRaw, doc.global.tema)

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
