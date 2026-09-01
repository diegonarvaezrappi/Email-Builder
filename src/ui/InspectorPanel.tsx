// ============================================================================
// Panel derecho: las opciones del componente seleccionado en el viewport.
// Cada slot trae su propio formulario (SlotDef.PropertiesPanel del registry),
// así que este panel no sabe nada de footers en particular.
//
// CONTENIDOS es distinto: no tiene PropertiesPanel propio (no hay "el panel
// de todo el array"), lo editable vive por-instancia — se resuelve acá antes
// de tocar `registry`, buscando el bloque por `selected.blockId` y su
// PropertiesPanel en contentBlockRegistry. Y un nivel más adentro todavía:
// DEALS tiene sus propias tarjetas, así que si viene `selected.dealCardId` se
// muestra el panel de esa tarjeta (con botón para volver al bloque), y el panel
// del bloque suma un botón "+ Agregar deal" — el mismo híbrido que BANNER.
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
import { contentBlockRegistry, getModuleAreas } from '../contentBlockRegistry'
import { getBannerItemDef } from '../bannerItemRegistry'
import { getModuleItemDef } from '../bodyMoleculeRegistry'
import { selectBlock, selectDealCard, selectSlot, type Selection } from './selection'
import { BannerImageTypeSelector } from '../components/banner/ImageTypeSelector'
import { BannerItemCatalog } from '../components/banner/ItemCatalog'
import { ModuleItemCatalog } from '../components/contentModules/ModuleItemCatalog'
import { findModuleBlockByItem } from '../components/contentModules/blocks'
import { IMAGE_MODULE_TYPES, type ImageModuleType } from '../components/banner/exclusivity'
import type { BannerItemType } from '../components/banner/items/schemas'
import type { ModuleItemType } from '../moduleItems/schemas'
import { findDealsBlockByCard } from '../components/deals/blocks'
import { DealCardPiecePropertiesPanel, DealCardPropertiesPanel } from '../components/deals/panels'
import { DEAL_CARD_PIECE_LABELS, DEALS_MAX_CARDS } from '../components/deals/schema'

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
  onChangeDealCard: (dealCardId: string, fields: unknown) => void
  onInsertDealCard: (blockId: string, atIndex: number) => void
  onChangeModuleItem: (moduleItemId: string, fields: unknown) => void
  onInsertModuleItem: (blockId: string, areaKey: string, type: ModuleItemType, atIndex: number) => void
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
  onChangeDealCard,
  onInsertDealCard,
  onChangeModuleItem,
  onInsertModuleItem,
}: InspectorPanelProps) {
  if (!selected) {
    return <EmptyHint text="Toca un componente del email para ver sus opciones." />
  }

  // Una molécula puntual del área libre de un módulo de body (ej. TITLE) — se
  // resuelve ANTES del bloque de CONTENIDOS genérico, mismo criterio que una
  // tarjeta de deal o una pieza de banner. La selección solo trae el id de la
  // molécula, el bloque dueño se deduce (ver components/contentModules/blocks.ts).
  if (selected.slot === 'CONTENIDOS' && selected.moduleItemId) {
    const found = findModuleBlockByItem(doc.contenidos, selected.moduleItemId)
    const item = found?.items.find((it) => it.id === selected.moduleItemId)
    const def = item ? getModuleItemDef(item.type) : undefined
    if (!found || !item || !def) {
      return <EmptyHint text="Selecciona una molécula para ver sus opciones." />
    }
    return (
      <aside className="panel-inspector">
        <button type="button" className="inspector-back" onClick={() => onSelect(selectBlock(found.block.id))}>
          ← Volver a {contentBlockRegistry[found.block.type]?.label ?? found.block.type}
        </button>
        <h2>{def.label}</h2>
        <def.PropertiesPanel
          value={item.fields}
          onChange={(next) => onChangeModuleItem(item.id, next)}
          doc={doc}
          onChangeGlobal={onChangeGlobal}
        />
      </aside>
    )
  }

  // Una tarjeta de deal puntual — se resuelve ANTES del bloque de CONTENIDOS
  // genérico, igual que una pieza de banner se resuelve antes del banner
  // general. La selección solo trae el id de la tarjeta, el bloque dueño se
  // deduce (ver components/deals/blocks.ts).
  if (selected.slot === 'CONTENIDOS' && selected.dealCardId) {
    const found = findDealsBlockByCard(doc.contenidos, selected.dealCardId)
    const card = found?.block.fields.items.find((c) => c.id === selected.dealCardId)
    if (!found || !card) {
      return <EmptyHint text="Selecciona un deal para ver sus opciones." />
    }

    // Una línea puntual DENTRO de la tarjeta (copy1, precio, tag1, etc.) — se
    // resuelve ANTES que la vista general de la tarjeta, mismo criterio que
    // la tarjeta se resuelve antes que el bloque DEALS genérico.
    if (selected.dealCardPieceType) {
      return (
        <aside className="panel-inspector">
          <button type="button" className="inspector-back" onClick={() => onSelect(selectDealCard(card.id))}>
            ← Volver al deal
          </button>
          <h2>{DEAL_CARD_PIECE_LABELS[selected.dealCardPieceType]}</h2>
          <DealCardPiecePropertiesPanel
            pieceType={selected.dealCardPieceType}
            value={card.fields}
            onChange={(next) => onChangeDealCard(card.id, next)}
            doc={doc}
          />
        </aside>
      )
    }

    const position = found.block.fields.items.indexOf(card) + 1
    return (
      <aside className="panel-inspector">
        <button type="button" className="inspector-back" onClick={() => onSelect(selectBlock(found.block.id))}>
          ← Volver a Deals
        </button>
        <h2>
          Deal {position} de {found.block.fields.items.length}
        </h2>
        <DealCardPropertiesPanel value={card.fields} onChange={(next) => onChangeDealCard(card.id, next)} />
      </aside>
    )
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
        {/* Igual que BannerItemCatalog vive fuera de BannerPropertiesPanel:
            agregar una tarjeta necesita una acción del store que el shape de
            props de ContentBlockDef.PropertiesPanel no transporta. */}
        {block.type === 'DEALS' && (
          <button
            type="button"
            disabled={block.fields.items.length >= DEALS_MAX_CARDS}
            onClick={() => onInsertDealCard(block.id, block.fields.items.length)}
          >
            + Agregar deal
          </button>
        )}
        {/* Igual que el botón "+ Agregar deal" de arriba: insertar necesita
            onInsertModuleItem, una acción del store que
            ContentBlockDef.PropertiesPanel no recibe. Un catálogo POR ÁREA
            (getModuleAreas resuelve ['main'] sin label para los módulos de
            una sola zona — TITLE/BULLET/BENEFICIOS — y las áreas reales de
            COL1 en adelante). */}
        {contentBlockRegistry[block.type]?.usesModuleItems &&
          getModuleAreas(contentBlockRegistry[block.type]!).map((area) => (
            <div key={area.key} className="module-area-catalog">
              {area.label && <p className="field-group-label">{area.label}</p>}
              <ModuleItemCatalog
                onInsert={(type) =>
                  onInsertModuleItem(
                    block.id,
                    area.key,
                    type,
                    (block.fields as { items: { areaKey: string }[] }).items.filter((it) => it.areaKey === area.key).length,
                  )
                }
              />
            </div>
          ))}
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
