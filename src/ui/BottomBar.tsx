// ============================================================================
// Menú inferior del panel central: pestañas (Preview / Tropicalizar /
// Exportar / Importar) a la izquierda; a la derecha el menú de vista
// (hamburguesa: país + escritorio/móvil), Deshacer/Rehacer y el estado de
// guardado. Vive abajo para que el preview llegue al borde superior de la
// ventana. Siempre en una sola línea — ver `.bottom-bar` en App.css.
// ============================================================================
import { useBuilder, useTemporal } from '../store/store'
import { PREVIEW_COUNTRIES, PREVIEW_COUNTRY_LABELS, type PreviewCountry } from '../preview/liquidPreview'
import { VIEWPORT_TAB_LABELS, VIEWPORT_TAB_ORDER, type ViewportTab } from './viewportTab'
import { Popover } from './Popover'
import type { PreviewDevice } from './Viewport'

interface BottomBarProps {
  tab: ViewportTab
  onChangeTab: (next: ViewportTab) => void
  tropicalizeViewMode: 'base' | 'country'
  onChangeTropicalizeViewMode: (next: 'base' | 'country') => void
  country: PreviewCountry
  onChangeCountry: (next: PreviewCountry) => void
  device: PreviewDevice
  onChangeDevice: (next: PreviewDevice) => void
}

const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

const MenuIcon = () => (
  <svg {...svgProps}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const UndoIcon = () => (
  <svg {...svgProps}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
)

const RedoIcon = () => (
  <svg {...svgProps}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </svg>
)

export function BottomBar({
  tab,
  onChangeTab,
  tropicalizeViewMode,
  onChangeTropicalizeViewMode,
  country,
  onChangeCountry,
  device,
  onChangeDevice,
}: BottomBarProps) {
  const { canUndo, canRedo, undo, redo } = useTemporal()
  const saveStatus = useBuilder((s) => s.saveStatus)
  const saveError = useBuilder((s) => s.saveError)
  const saveStatusLabel =
    saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? 'Guardado' : saveStatus === 'error' ? (saveError ?? 'Error al guardar') : ''
  const showsCanvas = tab === 'preview' || tab === 'tropicalize'

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-tabs">
        {VIEWPORT_TAB_ORDER.map((t) => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => onChangeTab(t)}>
            {VIEWPORT_TAB_LABELS[t]}
          </button>
        ))}
        {tab === 'tropicalize' && (
          <div className="tropicalize-view-mode" role="group" aria-label="Qué muestra el lienzo de Tropicalizar">
            <button
              type="button"
              className={tropicalizeViewMode === 'base' ? 'active' : ''}
              aria-pressed={tropicalizeViewMode === 'base'}
              onClick={() => onChangeTropicalizeViewMode('base')}
            >
              Diseño base
            </button>
            <button
              type="button"
              className={tropicalizeViewMode === 'country' ? 'active' : ''}
              aria-pressed={tropicalizeViewMode === 'country'}
              onClick={() => onChangeTropicalizeViewMode('country')}
            >
              Vista país
            </button>
          </div>
        )}
      </div>

      <div className="bottom-bar-actions">
        <span className={`save-status${saveStatus === 'error' ? ' error' : ''}`} title={saveStatusLabel}>
          {saveStatusLabel}
        </span>

        {showsCanvas && (
          <Popover
            label={
              <>
                <MenuIcon />
                <span className="label">{PREVIEW_COUNTRY_LABELS[country]} · {device === 'mobile' ? 'Móvil' : 'Escritorio'}</span>
              </>
            }
            ariaLabel="Opciones de vista"
            buttonClassName="icon-button"
          >
            <div className="view-menu">
              <label className="field">
                <span>{tab === 'tropicalize' ? 'País (vista)' : 'País (solo preview)'}</span>
                <select value={country} onChange={(e) => onChangeCountry(e.target.value as PreviewCountry)}>
                  {PREVIEW_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {PREVIEW_COUNTRY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field">
                <span>Vista</span>
                <div className="segmented" role="group" aria-label="Tamaño de preview">
                  <button type="button" className={device === 'desktop' ? 'active' : ''} aria-pressed={device === 'desktop'} onClick={() => onChangeDevice('desktop')}>
                    Escritorio
                  </button>
                  <button type="button" className={device === 'mobile' ? 'active' : ''} aria-pressed={device === 'mobile'} onClick={() => onChangeDevice('mobile')}>
                    Móvil
                  </button>
                </div>
              </div>
            </div>
          </Popover>
        )}

        <button type="button" className="icon-button" onClick={undo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer">
          <UndoIcon />
          <span className="label">Deshacer</span>
        </button>
        <button type="button" className="icon-button" onClick={redo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer">
          <RedoIcon />
          <span className="label">Rehacer</span>
        </button>
      </div>
    </div>
  )
}
