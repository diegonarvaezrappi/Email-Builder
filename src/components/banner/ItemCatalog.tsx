// ============================================================================
// Catálogo de piezas del banner — reemplaza a la vieja sublista "Piezas" del
// panel izquierdo (ui/LibraryPanel.tsx): ahora vive en el panel derecho,
// visible al seleccionar el banner "general" (ui/InspectorPanel.tsx), junto al
// resto de sus opciones. Cada card es origen de arrastre — mismo protocolo
// BANNER_ITEM_DRAG_TYPE de siempre, el drop en el Viewport no cambia — y
// además clickeable para insertar directo.
// ============================================================================
import { getBannerItemDef, BANNER_ITEM_LIBRARY_ORDER } from '../../bannerItemRegistry'
import type { BannerItemType } from './items/schemas'
import type { BannerType } from './schema'
import { BANNER_ITEM_DRAG_TYPE } from '../../ui/dragTypes'

interface BannerItemCatalogProps {
  bannerType: BannerType
  excludeTypes?: readonly BannerItemType[]
  disabled?: boolean
  onInsert: (type: BannerItemType) => void
}

export function BannerItemCatalog({ bannerType, excludeTypes = [], disabled, onInsert }: BannerItemCatalogProps) {
  const visibleTypes = BANNER_ITEM_LIBRARY_ORDER.filter((type) => !excludeTypes.includes(type))

  return (
    <div className="field">
      <span>Agregar pieza</span>
      <ul className="molecule-catalog-grid">
        {visibleTypes.map((type) => {
          const def = getBannerItemDef(type)
          const enabled = !disabled && Boolean(def?.orientations.includes(bannerType))
          const Icon = def?.Icon
          return (
            <li key={type}>
              <button
                type="button"
                className="option-card molecule-card"
                disabled={!enabled}
                draggable={enabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData(BANNER_ITEM_DRAG_TYPE, type)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onClick={() => enabled && onInsert(type)}
              >
                {Icon && <Icon className="molecule-card-icon" />}
                <span className="option-card-title">{def?.label ?? type}</span>
                {!enabled && !disabled && <span className="lib-item-tag">solo horizontal</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
