// ============================================================================
// Adaptador Selection → PropertiesPanel para el contenido de UNA rama de
// tropicalización. Mirror deliberado de la resolución de
// ui/InspectorPanel.tsx (moduleItem → dealCard → block → bannerItem → slot) —
// si se desincroniza de ese orden, el panel de Tropicalizar podría intentar
// editar un objetivo distinto del que el usuario ve seleccionado.
//
// A diferencia de InspectorPanel, acá NO se resuelve estructura (catálogos de
// "+ Agregar molécula/deal/pieza", botones de inserción): una rama edita
// CAMPOS del target ya existente, nunca agrega/quita hijos — ver el límite de
// alcance explícito documentado en el plan de la feature. Por eso este
// resolver vive aparte del de InspectorPanel en vez de compartirlo: un
// resolver común sería una mentira con 2 escotillas de escape.
// ============================================================================
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import type { Selection } from '../selection'
import { contentBlockRegistry } from '../../contentBlockRegistry'
import { getBannerItemDef } from '../../bannerItemRegistry'
import { getModuleItemDef } from '../../bodyMoleculeRegistry'
import { registry } from '../../registry'
import { findDealsBlockByCard } from '../../components/deals/blocks'
import { findModuleBlockByItem } from '../../components/contentModules/blocks'
import { DEAL_CARD_PIECE_LABELS, DEAL_CARD_PIECE_TYPES, type DealCardFields } from '../../components/deals/schema'
import { DealCardPiecePropertiesPanel, DealCardPropertiesPanel } from '../../components/deals/panels'

interface BranchFieldsEditorProps {
  selected: Selection
  doc: EmailDocument
  value: unknown
  onChange: (next: unknown) => void
  onChangeGlobal: (next: GlobalFields) => void
}

/**
 * Tipos cuyo `PropertiesPanel` de verdad escribe `doc.global` (hoy: el estilo
 * de CTA, compartido por TODO el mail) — exactamente 2, verificado grepeando
 * cada llamada real a `onChangeGlobal(` en la app. El resto de los paneles
 * declaran la prop pero nunca la usan.
 */
const GLOBAL_WRITING_TYPES = new Set(['CTA', 'CTA_INTERNO'])

function GlobalFieldWarning() {
  return (
    <p className="trop-global-warn">
      ⚠ Los ajustes globales (estilo de CTA) no se tropicalizan: cambiarlos acá afecta a todo el mail, no solo a estos países.
    </p>
  )
}

export function BranchFieldsEditor({ selected, doc, value, onChange, onChangeGlobal }: BranchFieldsEditorProps) {
  // No debería llegar hasta acá: un fondo de sección no es tropicalizable
  // (normalizeTropicalizationTarget los limpia al entrar a esta pestaña, ver
  // tropicalize/keys.ts#targetKeyFromSelection) — rama defensiva solo para
  // que `registry[selected.slot]` de más abajo tipe correcto.
  if (selected.slot === 'HERO_BG' || selected.slot === 'CONTENTS_BG') return null
  if (selected.slot === 'CONTENIDOS' && selected.moduleItemId) {
    const found = findModuleBlockByItem(doc.contenidos, selected.moduleItemId)
    const item = found?.items.find((it) => it.id === selected.moduleItemId)
    const def = item ? getModuleItemDef(item.type) : undefined
    if (!found || !item || !def) return null
    return <def.PropertiesPanel value={value} onChange={onChange} doc={doc} onChangeGlobal={onChangeGlobal} />
  }

  if (selected.slot === 'CONTENIDOS' && selected.dealCardId && !selected.dealCardPieceType) {
    const found = findDealsBlockByCard(doc.contenidos, selected.dealCardId)
    if (!found) return null
    const fields = value as DealCardFields
    return (
      <>
        <DealCardPropertiesPanel value={fields} onChange={onChange as (next: DealCardFields) => void} />
        {DEAL_CARD_PIECE_TYPES.map((type) => (
          <div key={type} className="module-area-catalog">
            <p className="field-group-label">{DEAL_CARD_PIECE_LABELS[type]}</p>
            <DealCardPiecePropertiesPanel
              pieceType={type}
              value={fields}
              onChange={onChange as (next: DealCardFields) => void}
              doc={doc}
            />
          </div>
        ))}
      </>
    )
  }

  if (selected.slot === 'CONTENIDOS' && selected.blockId) {
    const block = doc.contenidos.find((b) => b.id === selected.blockId)
    const def = block ? contentBlockRegistry[block.type] : undefined
    if (!block || !def) return null
    return (
      <>
        {GLOBAL_WRITING_TYPES.has(block.type) && <GlobalFieldWarning />}
        <def.PropertiesPanel value={value} onChange={onChange} doc={doc} onChangeGlobal={onChangeGlobal} />
      </>
    )
  }

  if (selected.slot === 'BANNER' && selected.bannerItemId) {
    const item = doc.banner.items.find((it) => it.id === selected.bannerItemId)
    const def = item ? getBannerItemDef(item.type) : undefined
    if (!item || !def) return null
    return (
      <>
        {GLOBAL_WRITING_TYPES.has(item.type) && <GlobalFieldWarning />}
        <def.PropertiesPanel value={value} onChange={onChange} doc={doc} onChangeGlobal={onChangeGlobal} />
      </>
    )
  }

  // Slot singleton (HEADER / BANNER general / FOOTER) — {value, onChange} nomás.
  const def = registry[selected.slot]
  if (!def?.PropertiesPanel) return null
  const { PropertiesPanel } = def
  return <PropertiesPanel value={value} onChange={onChange} />
}
