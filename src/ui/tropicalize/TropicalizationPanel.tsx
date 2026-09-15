// ============================================================================
// Panel derecho de la pestaña "Tropicalizar" — el editor de condicionales de
// país del elemento seleccionado. Ver el plan de la feature para el porqué
// de cada decisión de diseño (acordeón de una rama a la vez, la base como
// una tarjeta más al final, países ya tomados deshabilitados, etc.).
// ============================================================================
import { useState } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { PREVIEW_COUNTRIES, PREVIEW_COUNTRY_LABELS, type PreviewCountry } from '../../preview/countries'
import { baseFieldsForKey, targetKeyFromSelection, type TropicalizeKey } from '../../tropicalize/keys'
import { resolveBranchFields, countryCondition } from '../../tropicalize/render'
import { normalizeBranches, type TropicalizeCountry } from '../../tropicalize/schema'
import type { Selection } from '../selection'
import type { ViewportTab } from '../viewportTab'
import { CodeView } from '../CodeView'
import { BranchFieldsEditor } from './BranchFieldsEditor'
import { targetLabel } from './targetLabel'

interface TropicalizationPanelProps {
  document: EmailDocument
  selected: Selection | null
  country: PreviewCountry
  onChangeCountry: (next: PreviewCountry) => void
  onChangeTab: (next: ViewportTab) => void
  onChangeGlobal: (next: GlobalFields) => void
  onAddBranch: (key: TropicalizeKey, countries: TropicalizeCountry[]) => void
  onSetBranchCountries: (key: TropicalizeKey, index: number, countries: TropicalizeCountry[]) => void
  onSetBranchHidden: (key: TropicalizeKey, index: number, hidden: boolean) => void
  onSetBranchFields: (key: TropicalizeKey, index: number, baseFields: unknown, nextFields: unknown) => void
  onRemoveBranch: (key: TropicalizeKey, index: number) => void
  onReorderBranch: (key: TropicalizeKey, index: number, toIndex: number) => void
  onClearTropicalization: (key: TropicalizeKey) => void
}

function EmptyHint({ text }: { text: string }) {
  return (
    <aside className="panel-inspector empty">
      <p className="inspector-hint">{text}</p>
    </aside>
  )
}

function countryChipsText(countries: readonly string[]): string {
  return countries.map((c) => `[${c}]`).join(' ')
}

export function TropicalizationPanel({
  document: doc,
  selected,
  country,
  onChangeCountry,
  onChangeTab,
  onChangeGlobal,
  onAddBranch,
  onSetBranchCountries,
  onSetBranchHidden,
  onSetBranchFields,
  onRemoveBranch,
  onReorderBranch,
  onClearTropicalization,
}: TropicalizationPanelProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!selected) {
    return (
      <EmptyHint text="Tocá un elemento del email para tropicalizarlo. Cada elemento puede mostrar contenido distinto por país — el contenido que ves en Preview es el que reciben los países sin variante." />
    )
  }

  const key = targetKeyFromSelection(selected)
  if (!key) {
    return <EmptyHint text="Este elemento no admite variantes por país (las líneas de una tarjeta de deal se tropicalizan a nivel de la tarjeta entera)." />
  }

  const baseFields = baseFieldsForKey(doc, key)
  if (baseFields === null) {
    return <EmptyHint text="Ese elemento ya no está en el mail." />
  }

  const branches = normalizeBranches(doc.tropicalizations[key]?.branches ?? [])
  const claimedCountries = new Set(branches.flatMap((b) => b.countries))
  const residualCountries = PREVIEW_COUNTRIES.filter((c) => !claimedCountries.has(c))

  const previewedIndex = branches.findIndex((b) => b.countries.includes(country))
  const previewedBranchHidden = previewedIndex !== -1 && branches[previewedIndex].hidden

  const handleAddBranch = () => {
    if (residualCountries.length === 0) return
    onAddBranch(key, [residualCountries[0]])
    setOpenIndex(branches.length)
  }

  const handleToggleCountry = (index: number, code: TropicalizeCountry, checked: boolean) => {
    const current = branches[index].countries
    const next = checked ? [...current, code] : current.filter((c) => c !== code)
    onSetBranchCountries(key, index, next)
  }

  return (
    <aside className="panel-inspector">
      <h2>{targetLabel(doc, selected)}</h2>
      <p className="trop-summary">
        {branches.length} variante{branches.length === 1 ? '' : 's'} · {claimedCountries.size} de {PREVIEW_COUNTRIES.length} países
        cubiertos
      </p>

      {previewedIndex === -1 && branches.length > 0 && (
        <p className="inspector-trop-notice">
          Con País = {PREVIEW_COUNTRY_LABELS[country]} este elemento muestra el contenido base (ninguna variante lo cubre).
        </p>
      )}
      {previewedBranchHidden && (
        <p className="inspector-trop-notice">
          Con País = {PREVIEW_COUNTRY_LABELS[country]} este elemento NO se muestra (variante vacía).
          {residualCountries.length > 0 && (
            <button type="button" className="link-button" onClick={() => onChangeCountry(residualCountries[0])}>
              Ver en {PREVIEW_COUNTRY_LABELS[residualCountries[0]]}
            </button>
          )}
        </p>
      )}

      {branches.map((branch, index) => {
        const claimedByEarlier = new Set(branches.slice(0, index).flatMap((b) => b.countries))
        const isOpen = openIndex === index
        return (
          <div key={index} className={`branch-card${isOpen ? ' is-open' : ''}${index === previewedIndex ? ' is-previewed' : ''}`}>
            <div className="branch-card-header">
              <button type="button" className="branch-card-toggle" onClick={() => setOpenIndex(isOpen ? null : index)}>
                {isOpen ? '▾' : '▸'} Variante {index + 1} {countryChipsText(branch.countries)}
              </button>
              <div className="branch-card-actions">
                <button
                  type="button"
                  className="branch-icon-btn"
                  title="Ver esta variante en el lienzo"
                  onClick={() => onChangeCountry(branch.countries[0])}
                >
                  👁
                </button>
                <button
                  type="button"
                  className="branch-icon-btn"
                  disabled={index === 0}
                  onClick={() => onReorderBranch(key, index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="branch-icon-btn"
                  disabled={index === branches.length - 1}
                  onClick={() => onReorderBranch(key, index, index + 2)}
                >
                  ↓
                </button>
                <button type="button" className="branch-icon-btn slot-delete-inline" onClick={() => onRemoveBranch(key, index)}>
                  ×
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="branch-body">
                {index === previewedIndex && (
                  <p className="branch-previewed-hint">Es lo que estás viendo (País: {PREVIEW_COUNTRY_LABELS[country]})</p>
                )}

                <p className="field-group-label">Países</p>
                <div className="country-chips">
                  {PREVIEW_COUNTRIES.map((code) => {
                    const disabled = claimedByEarlier.has(code)
                    return (
                      <label key={code} className={`country-chip${disabled ? ' is-disabled' : ''}`} title={disabled ? 'Ya está en una variante anterior' : undefined}>
                        <input
                          type="checkbox"
                          checked={branch.countries.includes(code)}
                          disabled={disabled}
                          onChange={(e) => handleToggleCountry(index, code, e.target.checked)}
                        />
                        {code}
                      </label>
                    )
                  })}
                </div>

                <p className="field-group-label">Contenido de esta variante</p>
                <label className="field-radio">
                  <input type="radio" checked={!branch.hidden} onChange={() => onSetBranchHidden(key, index, false)} />
                  Contenido propio
                </label>
                <label className="field-radio">
                  <input type="radio" checked={branch.hidden} onChange={() => onSetBranchHidden(key, index, true)} />
                  Vacía — ocultar en estos países
                </label>

                {!branch.hidden && (
                  <>
                    <button
                      type="button"
                      className="trop-copy-base"
                      onClick={() => onSetBranchFields(key, index, baseFields, baseFields)}
                    >
                      Copiar del contenido base
                    </button>
                    <BranchFieldsEditor
                      selected={selected}
                      doc={doc}
                      value={resolveBranchFields(baseFields as object, branch)}
                      onChange={(next) => onSetBranchFields(key, index, baseFields, next)}
                      onChangeGlobal={onChangeGlobal}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      <button type="button" className="primary" disabled={residualCountries.length === 0} onClick={handleAddBranch}>
        + {branches.length === 0 ? 'Tropicalizar este elemento' : 'Agregar variante'}
      </button>

      {branches.length > 0 && (
        <>
          <div className={`branch-card branch-card-base${previewedIndex === -1 ? ' is-previewed' : ''}`}>
            <div className="branch-card-header">
              <span>Base · el resto {countryChipsText(residualCountries)}</span>
              <button type="button" className="link-button" onClick={() => onChangeTab('preview')}>
                Editar en Preview →
              </button>
            </div>
            <p className="branch-base-hint">Lo que edita la pestaña Preview — es el {'{% else %}'} de la condicional.</p>
          </div>

          <details className="trop-liquid-details">
            <summary>Ver el Liquid generado</summary>
            <CodeView
              code={[
                ...branches.flatMap((b, i) => [
                  `{% ${i === 0 ? 'if' : 'elsif'} ${countryCondition(b.countries)} %}`,
                  b.hidden ? '  (oculto)' : `  … contenido de la Variante ${i + 1} …`,
                ]),
                '{% else %}',
                '  … contenido base (lo que edita Preview) …',
                '{% endif %}',
              ].join('\n')}
            />
          </details>

          <button type="button" className="trop-clear" onClick={() => onClearTropicalization(key)}>
            Quitar toda la tropicalización de este elemento
          </button>
          <p className="trop-clear-hint">Podés revertirlo con Deshacer.</p>
        </>
      )}
    </aside>
  )
}
