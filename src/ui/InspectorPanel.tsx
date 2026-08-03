// ============================================================================
// Panel derecho: las opciones del componente seleccionado en el viewport.
// Cada slot trae su propio formulario (SlotDef.PropertiesPanel del registry),
// así que este panel no sabe nada de footers en particular.
//
// CONTENIDOS es distinto: no tiene PropertiesPanel propio (no hay "el panel
// de todo el array"), lo editable vive por-instancia — se resuelve acá antes
// de tocar `registry`, buscando el bloque por `selected.blockId` y su
// PropertiesPanel en contentBlockRegistry.
//
// BANNER es un híbrido: si `selected.bannerItemId` viene presente, se resuelve
// igual que un bloque de CONTENIDOS (buscando la pieza en doc.banner.items y
// su PropertiesPanel en bannerItemRegistry) ANTES de llegar a `registry` — con
// un botón extra para volver a la vista general del banner. Si no viene, es el
// banner "general": su PropertiesPanel normal del registry (link + limpieza de
// piezas ocultas — el tipo de banner ahora se elige en el panel izquierdo, ver
// ui/LibraryPanel.tsx) + el selector de tipo de imagen (solo horizontal) +
// el catálogo completo de piezas para arrastrar.
// ============================================================================
import type { EmailDocument } from '../model'
import type { GlobalFields } from '../global/schema'
import { registry, SLOT_LABELS } from '../registry'
import { contentBlockRegistry } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import { selectSlot, type Selection } from './selection'
import { BannerImageTypeSelector } from '../components/banner/ImageTypeSelector'
import { BannerItemCatalog } from '../components/banner/ItemCatalog'
import { IMAGE_MODULE_TYPES, type ImageModuleType } from '../components/banner/exclusivity'
import type { BannerItemType } from '../components/banner/items/schemas'

interface InspectorPanelProps {
  document: EmailDocument
  selected: Selection | null
  onSelect: (next: Selection) => void
  onChange: (docKey: keyof EmailDocument, fields: unknown) => void
  onChangeBlock: (blockId: string, fields: unknown) => void
  onChangeBannerItem: (bannerItemId: string, fields: unknown) => void
  onChangeGlobal: (fields: GlobalFields) => void
  onInsertBannerItem: (type: BannerItemType, atIndex: number) => void
  onSetBannerImageModule: (type: ImageModuleType) => void
}

function EmptyHint({ text }: { text: string }) {
  return (
    <aside className="panel-inspector empty">
      <p className="inspector-hint">{text}</p>
    </aside>
  )
}

export function InspectorPanel({
  document: doc,
  selected,
  onSelect,
  onChange,
  onChangeBlock,
  onChangeBannerItem,
  onChangeGlobal,
  onInsertBannerItem,
  onSetBannerImageModule,
}: InspectorPanelProps) {
  if (!selected) {
    return <EmptyHint text="Toca un componente del email para ver sus opciones." />
  }

  if (selected.slot === 'CONTENIDOS') {
    const block = selected.blockId ? doc.contenidos.find((b) => b.id === selected.blockId) : undefined
    if (!block) {
      return <EmptyHint text="Selecciona un bloque de Contenidos para ver sus opciones." />
    }
    const def = contentBlockRegistry[block.type]
    if (!def) {
      return <EmptyHint text="Tipo de bloque no soportado." />
    }
    return (
      <aside className="panel-inspector">
        <h2>{def.label}</h2>
        <def.PropertiesPanel
          value={block.fields}
          onChange={(next) => onChangeBlock(block.id, next)}
          doc={doc}
          onChangeGlobal={onChangeGlobal}
        />
      </aside>
    )
  }

  if (selected.slot === 'BANNER' && selected.bannerItemId) {
    const item = doc.banner.items.find((it) => it.id === selected.bannerItemId)
    if (!item) {
      return <EmptyHint text="Selecciona una pieza del Banner para ver sus opciones." />
    }
    const def = getBannerItemDef(item.type)
    if (!def) {
      return <EmptyHint text="Tipo de pieza no soportado." />
    }
    return (
      <aside className="panel-inspector">
        <button type="button" className="inspector-back" onClick={() => onSelect(selectSlot('BANNER'))}>
          ← Volver al banner
        </button>
        <h2>{def.label}</h2>
        <def.PropertiesPanel
          value={item.fields}
          onChange={(next) => onChangeBannerItem(item.id, next)}
          doc={doc}
          onChangeGlobal={onChangeGlobal}
        />
      </aside>
    )
  }

  // Banner "general" (sin pieza puntual seleccionada): además de su propio
  // formulario (link + limpieza de piezas ocultas), muestra el selector de
  // tipo de imagen (solo horizontal — vertical no tiene elección, ver
  // ImageTypeSelector.tsx) y el catálogo completo de piezas para arrastrar —
  // reemplaza a la vieja sublista "Piezas" del panel izquierdo.
  if (selected.slot === 'BANNER') {
    const def = registry.BANNER
    if (!def?.PropertiesPanel) {
      return <EmptyHint text="Toca un componente del email para ver sus opciones." />
    }
    const { PropertiesPanel } = def
    return (
      <aside className="panel-inspector">
        <h2>{SLOT_LABELS.BANNER}</h2>
        <PropertiesPanel value={doc.banner} onChange={(next) => onChange('banner', next)} />
        {doc.banner.bannerType === 'horizontal' && (
          <BannerImageTypeSelector items={doc.banner.items} onSelect={onSetBannerImageModule} />
        )}
        <BannerItemCatalog
          bannerType={doc.banner.bannerType}
          excludeTypes={doc.banner.bannerType === 'horizontal' ? IMAGE_MODULE_TYPES : []}
          onInsert={(type) => onInsertBannerItem(type, doc.banner.items.length)}
        />
      </aside>
    )
  }

  const def = registry[selected.slot]
  if (!def || !def.PropertiesPanel) {
    return <EmptyHint text="Toca un componente del email para ver sus opciones." />
  }

  const { PropertiesPanel } = def
  return (
    <aside className="panel-inspector">
      <h2>{SLOT_LABELS[selected.slot]}</h2>
      <PropertiesPanel value={doc[def.docKey]} onChange={(next) => onChange(def.docKey, next)} />
    </aside>
  )
}
