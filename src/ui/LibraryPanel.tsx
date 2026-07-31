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
// BANNER es un híbrido: SÍ es un slot singleton (se puede eliminar/restaurar,
// como Cierre), pero también aloja una lista repetible de hasta 10 tipos de
// pieza (como CONTENIDOS). Se muestra como grupo con 2 filas de TIPO de
// banner (vertical/horizontal — arrastrar una restaura el slot y fija ese
// tipo en el mismo gesto) + una sublista de piezas, cada una habilitada solo
// si tiene archivo/comportamiento para el tipo de banner activo (ver
// bannerItemRegistry.ts, `orientations`).
//
// Los ajustes globales (el tema) NO viven acá — van en la barra superior, ver
// ui/ToolbarGlobals.tsx.
// ============================================================================
import type { EmailDocument, SlotName } from '../model'
import { SLOT_ORDER } from '../model'
import { registry, SLOT_LABELS } from '../registry'
import { getContentBlockDef } from '../contentBlockRegistry'
import { getBannerItemDef, BANNER_ITEM_LIBRARY_ORDER } from '../bannerItemRegistry'
import { BANNER_TYPE_LABELS, BANNER_TYPE_VALUES } from '../components/banner/schema'
import { isSlotSelected, selectSlot, type Selection } from './selection'
import { SLOT_DRAG_TYPE, CONTENT_BLOCK_DRAG_TYPE, BANNER_TYPE_DRAG_TYPE, BANNER_ITEM_DRAG_TYPE } from './dragTypes'

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
}

export function LibraryPanel({ document: doc, selected, onSelect }: LibraryPanelProps) {
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
                  <ul className="lib-list lib-list-nested">
                    {BANNER_TYPE_VALUES.map((type) => (
                      <li key={type}>
                        <button
                          type="button"
                          className={`lib-item${!isRemoved && doc.banner.bannerType === type ? ' active' : ''}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(BANNER_TYPE_DRAG_TYPE, type)
                            e.dataTransfer.effectAllowed = 'copy'
                          }}
                          onClick={() => onSelect(selectSlot('BANNER'))}
                        >
                          <span className="lib-item-name">{BANNER_TYPE_LABELS[type]}</span>
                          {isRemoved && <span className="lib-item-tag">eliminado — arrastra para restaurar</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <span className="lib-group-sub-label">Piezas</span>
                  <ul className="lib-list lib-list-nested">
                    {BANNER_ITEM_LIBRARY_ORDER.map((type) => {
                      const def = getBannerItemDef(type)
                      const enabled = Boolean(def?.orientations.includes(doc.banner.bannerType))
                      return (
                        <li key={type}>
                          <button
                            type="button"
                            className="lib-item"
                            disabled={!enabled}
                            draggable={enabled}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(BANNER_ITEM_DRAG_TYPE, type)
                              e.dataTransfer.effectAllowed = 'copy'
                            }}
                          >
                            <span className="lib-item-name">{def?.label ?? type}</span>
                            {!enabled && <span className="lib-item-tag">solo horizontal</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
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
