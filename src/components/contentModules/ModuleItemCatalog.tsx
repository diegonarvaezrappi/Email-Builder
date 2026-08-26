// ============================================================================
// Catálogo de moléculas del área libre de un módulo de body — mismo patrón
// que components/banner/ItemCatalog.tsx (BannerItemCatalog), un nivel más
// arriba: acá el catálogo es ÚNICO y compartido por TODOS los módulos (ver
// bodyMoleculeRegistry.ts), no las 10 piezas de un solo banner. Cada card es
// origen de arrastre (MODULE_ITEM_DRAG_TYPE, el Viewport decide dónde cae) y
// además clickeable para insertar al final del área.
// ============================================================================
import { getModuleItemDef, MODULE_ITEM_LIBRARY_ORDER } from '../../bodyMoleculeRegistry'
import type { ModuleItemType } from '../../moduleItems/schemas'
import { MODULE_ITEM_DRAG_TYPE } from '../../ui/dragTypes'

interface ModuleItemCatalogProps {
  onInsert: (type: ModuleItemType) => void
}

export function ModuleItemCatalog({ onInsert }: ModuleItemCatalogProps) {
  return (
    <div className="field">
      <span>Agregar molécula</span>
      <ul className="molecule-catalog-grid">
        {MODULE_ITEM_LIBRARY_ORDER.map((type) => {
          const def = getModuleItemDef(type)
          const Icon = def?.Icon
          return (
            <li key={type}>
              <button
                type="button"
                className="option-card"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(MODULE_ITEM_DRAG_TYPE, type)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onClick={() => onInsert(type)}
              >
                {Icon && <Icon className="option-card-icon" />}
                <span className="option-card-title">{def?.label ?? type}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
