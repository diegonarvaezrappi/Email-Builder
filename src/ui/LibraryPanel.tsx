// ============================================================================
// Panel izquierdo: la librería de componentes del mail.
//
// Lista los slots del maestro. Solo los que tienen entrada en el registry son
// seleccionables; el resto se muestra deshabilitado para que se vea qué falta
// por implementar (y en qué orden va dentro del mail).
//
// CONTENIDOS es distinto: no es un slot singleton (togglable visible/oculto),
// es un contenedor libre y repetible — se muestra como una etiqueta de grupo
// con los tipos de bloque de contenido posibles anidados debajo (hoy solo CTA
// implementado; TITLE/DEALS/etc. se muestran "pendiente"). Esas filas son
// solo origen de arrastre (no hay "la" instancia de CTA que seleccionar a
// nivel de tipo — las instancias concretas se seleccionan haciendo click en
// su overlay del Viewport).
//
// BANNER es un slot singleton (se puede eliminar/restaurar, como Cierre), pero
// a diferencia de Header/Footer/Cierre se muestra como un grupo con 2 cards
// de TIPO de banner (vertical/horizontal) en vez de una sola fila — clickear
// una cambia el tipo EN TIEMPO REAL (y restaura el slot si estaba eliminado),
// resaltando la que está activa; también sigue siendo arrastrable, mismo
// gesto que antes. El catálogo de piezas (los 10 tipos posibles, ver
// bannerItemRegistry.ts) ya NO vive acá — se movió al panel derecho
// (components/banner/ItemCatalog.tsx), visible al seleccionar el banner.
//
// Los ajustes globales (el tema) NO viven acá — van en la barra superior, ver
// ui/ToolbarGlobals.tsx.
// ============================================================================
import type { EmailDocument, SlotName } from '../model'
import { SLOT_ORDER } from '../model'
import { registry, SLOT_LABELS } from '../registry'
import { getContentBlockDef } from '../contentBlockRegistry'
import { BANNER_TYPE_CAPTIONS, BANNER_TYPE_TITLES, BANNER_TYPE_VALUES } from '../components/banner/schema'
import { isSlotSelected, selectSlot, type Selection } from './selection'
import { SLOT_DRAG_TYPE, CONTENT_BLOCK_DRAG_TYPE, BANNER_TYPE_DRAG_TYPE } from './dragTypes'

/** Los 9 tipos de contenido que el maestro documenta dentro de CONTENIDOS — ver el comentario "WRAPPER DE CONTENIDOS". */
const CONTENT_BLOCK_LIBRARY_ITEMS: { type: string; label: string }[] = [
  { type: 'TITLE', label: 'Título' },
  { type: 'CTA', label: 'CTA' },
  { type: 'DEALS', label: 'Deals' },
  { type: 'LOGOS', label: 'Logos' },
  { type: 'CUPONES', label: 'Cupones' },
  { type: 'BENEFICIOS', label: 'Beneficios' },
  { type: 'COL1', label: '1 columna' },
  { type: 'COL2', label: '2 columnas' },
  { type: 'COL3', label: '3 columnas' },
]

interface LibraryPanelProps {
  document: EmailDocument
  selected: Selection | null
  onSelect: (next: Selection) => void
  onChangeSlot: (docKey: keyof EmailDocument, fields: unknown) => void
}

export function LibraryPanel({ document: doc, selected, onSelect, onChangeSlot }: LibraryPanelProps) {
  return (
    <aside className="panel-library">
      <section className="lib-section">
        <h2>Componentes</h2>
        <ul className="lib-list">
          {SLOT_ORDER.map((slot) => {
            if (slot === 'BANNER') {
              const isRemoved = Boolean(registry.BANNER?.removable && doc.banner.removed)
              return (
                <li key={slot} className="lib-group">
                  <span className="lib-group-label">{SLOT_LABELS.BANNER}</span>
                  <ul className="banner-type-grid">
                    {BANNER_TYPE_VALUES.map((type) => {
                      const active = !isRemoved && doc.banner.bannerType === type
                      return (
                        <li key={type}>
                          <button
                            type="button"
                            className={`option-card banner-type-card${active ? ' active' : ''}`}
                            aria-pressed={active}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(BANNER_TYPE_DRAG_TYPE, type)
                              e.dataTransfer.effectAllowed = 'copy'
                            }}
                            onClick={() => {
                              onChangeSlot('banner', { ...doc.banner, bannerType: type, removed: false })
                              onSelect(selectSlot('BANNER'))
                            }}
                          >
                            <span className="option-card-title">{BANNER_TYPE_TITLES[type]}</span>
                            <span className="option-card-caption">{BANNER_TYPE_CAPTIONS[type]}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {isRemoved && <span className="lib-item-tag">eliminado — elegí un tipo para restaurarlo</span>}
                </li>
              )
            }

            if (slot === 'CONTENIDOS') {
              return (
                <li key={slot} className="lib-group">
                  <span className="lib-group-label">{SLOT_LABELS.CONTENIDOS}</span>
                  <ul className="lib-list lib-list-nested">
                    {CONTENT_BLOCK_LIBRARY_ITEMS.map(({ type, label }) => {
                      const implemented = getContentBlockDef(type) !== undefined
                      return (
                        <li key={type}>
                          <button
                            type="button"
                            className="lib-item"
                            disabled={!implemented}
                            draggable={implemented}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(CONTENT_BLOCK_DRAG_TYPE, type)
                              e.dataTransfer.effectAllowed = 'copy'
                            }}
                          >
                            <span className="lib-item-name">{label}</span>
                            {!implemented && <span className="lib-item-tag">pendiente</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            }

            const def = registry[slot]
            const implemented = def !== undefined
            // Solo tiene sentido arrastrar de vuelta un slot que el usuario
            // sacó a mano desde el Viewport (ver SlotDef.removable) — no
            // arrastra nada un slot que ya está visible en el email.
            const isRemoved = implemented && def.removable && Boolean((doc[def.docKey] as { removed?: boolean }).removed)
            return (
              <li key={slot}>
                <button
                  type="button"
                  className={`lib-item${isSlotSelected(selected, slot) ? ' active' : ''}`}
                  disabled={!implemented}
                  aria-pressed={isSlotSelected(selected, slot)}
                  draggable={isRemoved}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(SLOT_DRAG_TYPE, slot)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onSelect(selectSlot(slot as SlotName))}
                >
                  <span className="lib-item-name">{SLOT_LABELS[slot]}</span>
                  {!implemented && <span className="lib-item-tag">pendiente</span>}
                  {isRemoved && <span className="lib-item-tag">eliminado — arrastra para restaurar</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </aside>
  )
}
