// ============================================================================
// Panel izquierdo de la pestaña "Tropicalizar" — reemplaza a LeftPanel (el
// arrastre para insertar no tiene sentido en esta pestaña). Lista TODO lo que
// ya tiene condicionales, agrupado por slot, para 2 casos que el lienzo solo
// no resuelve:
//   1. Un elemento OCULTO para el país que se está viendo (rama vacía) no
//      deja rect en el lienzo — sin este índice sería invisible E
//      inseleccionable.
//   2. HEADER/BANNER/FOOTER no tienen marcador de instancia (son singletons
//      ubicados por selector CSS) — si su única rama oculta el elemento para
//      el país actual, tampoco hay NADA en el lienzo a lo que engancharse.
// Cada fila resuelve contra el documento VIVO (targetLabelForKey) — si una
// clave ya no resuelve (huérfana), se saltea en silencio: el store ya poda
// estas al eliminar el elemento dueño (ver store/store.ts), así que en la
// práctica no debería aparecer ninguna, pero el índice no debe romperse si
// alguna sobrevive por un camino no cubierto.
// ============================================================================
import type { EmailDocument, SlotName } from '../../model'
import { SLOT_ORDER } from '../../model'
import { SLOT_LABELS } from '../../registry'
import { PREVIEW_COUNTRY_LABELS, type PreviewCountry } from '../../preview/countries'
import { normalizeBranches } from '../../tropicalize/schema'
import { parseTargetKey, selectionFromTargetKey, type TropicalizeKey, type TropicalizeKind } from '../../tropicalize/keys'
import type { Selection } from '../selection'
import { targetLabelForKey } from './targetLabel'

interface TropicalizationIndexPanelProps {
  document: EmailDocument
  country: PreviewCountry
  onSelect: (next: Selection) => void
  onChangeCountry: (next: PreviewCountry) => void
}

/** A qué grupo de SLOT_ORDER pertenece cada familia de clave — banner items
 *  agrupan bajo BANNER, bloques/tarjetas/moléculas bajo CONTENIDOS; `slot:*`
 *  resuelve de su propio id. */
const GROUP_BY_KIND: Partial<Record<TropicalizeKind, SlotName>> = {
  bitem: 'BANNER',
  block: 'CONTENIDOS',
  dcard: 'CONTENIDOS',
  mitem: 'CONTENIDOS',
}

function groupForKey(key: TropicalizeKey): SlotName | null {
  const parsed = parseTargetKey(key)
  if (!parsed) return null
  if (parsed.kind === 'slot') return parsed.id as SlotName
  return GROUP_BY_KIND[parsed.kind] ?? null
}

export function TropicalizationIndexPanel({ document: doc, country, onSelect, onChangeCountry }: TropicalizationIndexPanelProps) {
  const keys = Object.keys(doc.tropicalizations)
  const byGroup = new Map<SlotName, TropicalizeKey[]>()
  for (const key of keys) {
    const group = groupForKey(key)
    if (!group) continue
    if (!byGroup.has(group)) byGroup.set(group, [])
    byGroup.get(group)!.push(key)
  }

  // Filas ocultas para el PAÍS que se está viendo ahora mismo — el caso que
  // más confunde ("desapareció, ¿se rompió la app?").
  const hiddenForCountry = keys.filter((key) => {
    const branches = normalizeBranches(doc.tropicalizations[key]?.branches ?? [])
    return branches.some((b) => b.hidden && b.countries.includes(country))
  })

  return (
    <aside className="panel-library">
      <section className="lib-section">
        <h2>Tropicalizaciones</h2>
        <p className="trop-index-count">
          {keys.length === 0 ? 'Ningún elemento tropicalizado todavía.' : `${keys.length} elemento${keys.length === 1 ? '' : 's'} con variantes.`}
        </p>
        {SLOT_ORDER.map((slot) => {
          const slotKeys = byGroup.get(slot) ?? []
          return (
            <div key={slot} className="trop-index-group">
              <span className="lib-group-label">{SLOT_LABELS[slot]}</span>
              {slotKeys.length === 0 ? (
                <p className="trop-index-empty">— sin variantes —</p>
              ) : (
                <ul className="lib-list">
                  {slotKeys.map((key) => {
                    const label = targetLabelForKey(doc, key)
                    if (label === null) return null
                    const branches = normalizeBranches(doc.tropicalizations[key]?.branches ?? [])
                    const countries = branches.flatMap((b) => b.countries)
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          className="lib-item"
                          onClick={() => {
                            const selection = selectionFromTargetKey(key)
                            if (selection) onSelect(selection)
                          }}
                        >
                          <span className="lib-item-name">{label}</span>
                          <span className="lib-item-countries">
                            {countries.map((c) => (
                              <span key={c} className="country-chip-mini">
                                {c}
                              </span>
                            ))}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        {hiddenForCountry.length > 0 && (
          <div className="trop-index-hidden">
            <p className="field-group-label">Con País = {PREVIEW_COUNTRY_LABELS[country]} no se ven:</p>
            <ul className="lib-list">
              {hiddenForCountry.map((key) => {
                const label = targetLabelForKey(doc, key)
                if (label === null) return null
                const branches = normalizeBranches(doc.tropicalizations[key]?.branches ?? [])
                const otherCountry = branches.find((b) => !b.hidden)?.countries[0]
                return (
                  <li key={key} className="trop-index-hidden-row">
                    <span>{label}</span>
                    {otherCountry && (
                      <button type="button" className="link-button" onClick={() => onChangeCountry(otherCountry)}>
                        ver en {PREVIEW_COUNTRY_LABELS[otherCountry]} →
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </aside>
  )
}
