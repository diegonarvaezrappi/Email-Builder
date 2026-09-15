// ============================================================================
// Aviso en el panel de Preview (InspectorPanel) cuando el elemento
// seleccionado está tropicalizado — aclara que ahí se edita la BASE
// ({% else %}), que puede no ser lo que el lienzo está mostrando si el país
// de vista cae dentro de una rama.
// ============================================================================
import type { EmailDocument } from '../../model'
import { PREVIEW_COUNTRY_LABELS, type PreviewCountry } from '../../preview/countries'
import { baseFieldsForKey, targetKeyFromSelection } from '../../tropicalize/keys'
import { normalizeBranches } from '../../tropicalize/schema'
import type { Selection } from '../selection'
import type { ViewportTab } from '../viewportTab'

interface TropicalizationNoticeProps {
  document: EmailDocument
  selected: Selection
  country: PreviewCountry
  onChangeTab: (next: ViewportTab) => void
}

export function TropicalizationNotice({ document: doc, selected, country, onChangeTab }: TropicalizationNoticeProps) {
  const key = targetKeyFromSelection(selected)
  if (!key || baseFieldsForKey(doc, key) === null) return null

  const branches = normalizeBranches(doc.tropicalizations[key]?.branches ?? [])
  if (branches.length === 0) return null

  const coveredByBranch = branches.some((b) => b.countries.includes(country))

  return (
    <p className="inspector-trop-notice">
      {coveredByBranch ? (
        <>
          Este elemento está tropicalizado. Con País = {PREVIEW_COUNTRY_LABELS[country]} el lienzo muestra una variante, pero acá
          estás editando el contenido base ({'{% else %}'}).
        </>
      ) : (
        <>
          Este elemento está tropicalizado ({branches.length} variante{branches.length === 1 ? '' : 's'}). Con País ={' '}
          {PREVIEW_COUNTRY_LABELS[country]} el lienzo muestra justamente el contenido base, que es lo que estás editando acá.
        </>
      )}{' '}
      <button type="button" className="link-button" onClick={() => onChangeTab('tropicalize')}>
        Abrir en Tropicalizar →
      </button>
    </p>
  )
}
