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
// su PropertiesPanel en bannerItemRegistry) ANTES de llegar a `registry`; si
// no viene, es el propio slot BANNER (tipo + link), que sí tiene su
// PropertiesPanel normal en el registry, como Header/Footer/Cierre.
// ============================================================================
import type { EmailDocument } from '../model'
import type { GlobalFields } from '../global/schema'
import { registry, SLOT_LABELS } from '../registry'
import { contentBlockRegistry } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import type { Selection } from './selection'

interface InspectorPanelProps {
  document: EmailDocument
  selected: Selection | null
  onChange: (docKey: keyof EmailDocument, fields: unknown) => void
  onChangeBlock: (blockId: string, fields: unknown) => void
  onChangeBannerItem: (bannerItemId: string, fields: unknown) => void
  onChangeGlobal: (fields: GlobalFields) => void
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
  onChange,
  onChangeBlock,
  onChangeBannerItem,
  onChangeGlobal,
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
