// ============================================================================
// Panel izquierdo, en 3 pestañas que siguen las secciones del mail (CLAUDE.md
// del repo raíz §1.1):
//
//   Contenido general  → tema + fondo general
//   Sección Hero       → fondo hero, Header, Banner (tipo), árbol de piezas
//   Sección Contents   → fondo contents, grid de módulos, árbol de módulos, Footer
//
// Lo que se selecciona acá se edita en el panel derecho (InspectorPanel), igual
// que al clickearlo en el lienzo. La pestaña activa vive en App.tsx porque un
// click en el lienzo también la cambia (ver ui/leftTab.ts).
// ============================================================================
import type { ContentBlockType, EmailDocument } from '../model'
import type { GlobalFields } from '../global/schema'
import { SLOT_LABELS } from '../registry'
import { contentBlockRegistry } from '../contentBlockRegistry'
import { BANNER_TYPE_TITLES, BANNER_TYPE_VALUES } from '../components/banner/schema'
import { groupedThemes, themeLabel } from '../themes/themes'
import { isSlotSelected, selectSlot, type Selection } from './selection'
import { BANNER_TYPE_DRAG_TYPE, CONTENT_BLOCK_DRAG_TYPE } from './dragTypes'
import { BANNER_TYPE_ICONS, CONTENT_BLOCK_ICONS, HeaderIcon } from './moleculeIcons'
import { BackgroundCard } from './BackgroundFields'
import { ComponentTree } from './ComponentTree'
import type { TreeActionTarget, TreeReorder } from './componentTreeModel'
import { LEFT_TAB_LABELS, LEFT_TAB_ORDER, type LeftTab } from './leftTab'

/** Orden del grid de módulos — el del pedido del usuario. */
const CONTENT_BLOCK_GRID_ORDER: readonly ContentBlockType[] = [
  'TITLE',
  'BULLET',
  'CTA',
  'DEALS',
  'LOGOS',
  'CUPONES',
  'BENEFICIOS',
  'COL1',
  'COL2',
  'COL3',
]

interface LeftPanelProps {
  document: EmailDocument
  tab: LeftTab
  onChangeTab: (next: LeftTab) => void
  selected: Selection | null
  onSelect: (next: Selection) => void
  onChangeSlot: (docKey: keyof EmailDocument, fields: unknown) => void
  onChangeGlobal: (next: GlobalFields) => void
  onAddBlock: (type: ContentBlockType) => void
  treeExpanded: ReadonlySet<string>
  onToggleTreeExpanded: (key: string) => void
  onTreeReorder: (reorder: TreeReorder, toIndex: number) => void
  onTreeDuplicate: (target: TreeActionTarget) => void
  onTreeRemove: (target: TreeActionTarget) => void
}

export function LeftPanel(props: LeftPanelProps) {
  const { tab, onChangeTab } = props
  return (
    <aside className="panel-library left-panel">
      <nav className="left-tabs" role="tablist" aria-label="Secciones del mail">
        {LEFT_TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`left-tab${tab === t ? ' active' : ''}`}
            onClick={() => onChangeTab(t)}
          >
            {LEFT_TAB_LABELS[t]}
          </button>
        ))}
      </nav>
      <div className="left-tab-body" role="tabpanel">
        {tab === 'general' && <GeneralTab {...props} />}
        {tab === 'hero' && <HeroTab {...props} />}
        {tab === 'contents' && <ContentsTab {...props} />}
      </div>
    </aside>
  )
}

function GeneralTab({ document: doc, onChangeGlobal }: LeftPanelProps) {
  const global = doc.global
  return (
    <>
      <div className="left-card">
        <label className="field field-inline">
          <span className="left-card-title">Tema</span>
          <select value={global.tema} onChange={(e) => onChangeGlobal({ ...global, tema: e.target.value })}>
            {groupedThemes().map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.themes.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {themeLabel(t.slug)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <BackgroundCard scope="general" title="Fondo general" value={global} onChange={onChangeGlobal} />
    </>
  )
}

function HeroTab(props: LeftPanelProps) {
  const { document: doc, selected, onSelect, onChangeSlot, onChangeGlobal } = props
  const headerActive = isSlotSelected(selected, 'HEADER')
  const bannerActive = isSlotSelected(selected, 'BANNER')
  return (
    <>
      <BackgroundCard scope="hero" title="Fondo hero" value={doc.global} onChange={onChangeGlobal} />

      <button
        type="button"
        className={`left-card left-card-button${headerActive ? ' active' : ''}`}
        aria-pressed={headerActive}
        onClick={() => onSelect(selectSlot('HEADER'))}
      >
        <HeaderIcon className="left-card-icon" />
        <span className="left-card-title">{SLOT_LABELS.HEADER}</span>
      </button>

      <div className={`left-card${bannerActive ? ' active' : ''}`}>
        <button type="button" className="left-card-title left-card-title-button" onClick={() => onSelect(selectSlot('BANNER'))}>
          {SLOT_LABELS.BANNER}
        </button>
        <ul className="banner-type-grid">
          {BANNER_TYPE_VALUES.map((type) => {
            const active = doc.banner.bannerType === type
            const Icon = BANNER_TYPE_ICONS[type]
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
                    onChangeSlot('banner', { ...doc.banner, bannerType: type })
                    onSelect(selectSlot('BANNER'))
                  }}
                >
                  <Icon className="option-card-icon" />
                  <span className="option-card-title">{BANNER_TYPE_TITLES[type]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <SectionTree {...props} section="hero" heading="Elementos hero (tu diseño)" />
    </>
  )
}

function ContentsTab(props: LeftPanelProps) {
  const { document: doc, selected, onSelect, onChangeGlobal, onAddBlock } = props
  const footerActive = isSlotSelected(selected, 'FOOTER')
  return (
    <>
      <BackgroundCard scope="contents" title="Fondo contents" value={doc.global} onChange={onChangeGlobal} />

      <div className="left-card">
        <span className="left-card-title">Módulos de contenido</span>
        <ul className="module-grid">
          {CONTENT_BLOCK_GRID_ORDER.map((type) => {
            const def = contentBlockRegistry[type]
            if (!def) return null
            const Icon = CONTENT_BLOCK_ICONS[type]
            return (
              <li key={type}>
                <button
                  type="button"
                  className="option-card module-card"
                  title={`Agregar ${def.label} (o arrástralo al lienzo)`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(CONTENT_BLOCK_DRAG_TYPE, type)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onAddBlock(type)}
                >
                  <Icon className="option-card-icon" />
                  <span className="option-card-title">{def.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <SectionTree {...props} section="contents" heading="Elementos contenido (tu diseño)" />

      <button
        type="button"
        className={`left-card left-card-button${footerActive ? ' active' : ''}`}
        aria-pressed={footerActive}
        onClick={() => onSelect(selectSlot('FOOTER'))}
      >
        <span className="left-card-title">{SLOT_LABELS.FOOTER}</span>
      </button>
    </>
  )
}

function SectionTree({
  document: doc,
  section,
  heading,
  selected,
  onSelect,
  treeExpanded,
  onToggleTreeExpanded,
  onTreeReorder,
  onTreeDuplicate,
  onTreeRemove,
}: LeftPanelProps & { section: 'hero' | 'contents'; heading: string }) {
  return (
    <ComponentTree
      document={doc}
      section={section}
      heading={heading}
      selected={selected}
      expanded={treeExpanded}
      onSelect={onSelect}
      onToggleExpanded={onToggleTreeExpanded}
      onReorder={onTreeReorder}
      onDuplicate={onTreeDuplicate}
      onRemove={onTreeRemove}
    />
  )
}
