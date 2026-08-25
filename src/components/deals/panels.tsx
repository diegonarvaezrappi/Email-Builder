import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { RichTextInput } from '../../richText/RichTextInput'
import type { RichTextColorMap } from '../../richText/model'
import { themeVars } from '../../themes/themes'
import {
  DEAL_CARD_PIECE_LABELS,
  DEAL_CARD_PIECE_TYPES,
  DEAL_LOGO_SHAPE_LABELS,
  DEAL_LOGO_SHAPE_VALUES,
  DEALS_COPY_MAX_LENGTH,
  DEALS_MAX_CARDS,
  hideDealCardPiece,
  isDealCardPieceHidden,
  restoreDealCardPiece,
  type DealCardFields,
  type DealCardPieceType,
  type DealLogoShape,
  type DealsFields,
} from './schema'

/** Mismo helper que components/banner/items/panels.tsx (no exportado desde
 *  ahí, se duplica acá) — colores REALES del tema activo para la vista
 *  previa de RichTextInput mientras se escribe (el HTML final deja
 *  `{{color_x_mail_general}}` sin resolver hasta la pasada de tema de
 *  renderDealsSnippet). Hoy ningún campo de deals expone los 3 colores
 *  (`showColors={false}` en complemento2Text, ver más abajo), pero
 *  RichTextInput igual requiere un `RichTextColorMap` válido. */
function richTextColorsForTema(tema: string): RichTextColorMap {
  const vars = themeVars(tema)
  return {
    colorBase: vars.color_texto_mail_general ?? '#000000',
    colorAcento1: vars.color_acento1_mail_general ?? '#000000',
    colorAcento2: vars.color_acento2_mail_general ?? '#000000',
  }
}

/**
 * Panel del BLOQUE DEALS. Queda casi vacío a propósito: todo lo editable vive
 * en cada tarjeta (se selecciona en el lienzo, como una pieza de banner), así
 * que acá solo va la explicación de cómo operarlo. El botón "+ Agregar deal"
 * tampoco está acá sino en ui/InspectorPanel.tsx, por el mismo motivo que
 * BannerItemCatalog vive fuera de BannerPropertiesPanel: necesita la acción
 * insertDealCard del store, que el shape de props de
 * `ContentBlockDef.PropertiesPanel` no transporta.
 */
interface DealsPropertiesPanelProps {
  value: DealsFields
  onChange: (next: DealsFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

export function DealsPropertiesPanel({ value }: DealsPropertiesPanelProps) {
  return (
    <div className="properties-panel">
      <p className="inspector-hint">
        Esta fila tiene {value.items.length} de {DEALS_MAX_CARDS} deals. Hacé clic en un deal del lienzo para editarlo, o
        arrastralo para reordenarlo dentro de la fila.
      </p>
      {value.items.length < DEALS_MAX_CARDS ? (
        <p className="inspector-hint">
          La(s) celda(s) vacía(s) de esta fila quedan en blanco en el mail (no se borran). Usá "+ Agregar deal" para
          volver a llenarlas.
        </p>
      ) : null}
      <p className="inspector-hint">¿Necesitás otra fila de deals? Arrastrá "Deals" de nuevo desde el panel de componentes — podés agregar tantas como quieras, y ubicar otros bloques (ej. un CTA) entre una fila y otra.</p>
    </div>
  )
}

/**
 * El patrón que se repite en 10 de las piezas de la tarjeta: un checkbox que la
 * enciende y el texto que va adentro, inerte cuando está apagada. Es el mismo
 * shape del "Ahora" de PROMO y del "DE REINTEGRO" de CREDITOS
 * (components/banner/items/panels.tsx); acá se extrae porque se repite 10 veces
 * en un solo panel. La etiqueta del checkbox hace de título del grupo, así que
 * el input va sin `<span>` propio y con `aria-label`.
 */
function TogglableTextField({
  label,
  enabled,
  onToggle,
  text,
  onText,
  hint,
  maxLength,
  placeholder,
}: {
  label: string
  enabled: boolean
  onToggle: (next: boolean) => void
  text: string
  onText: (next: string) => void
  hint?: string
  maxLength?: number
  placeholder?: string
}) {
  return (
    <>
      <label className="field field-checkbox">
        <input type="checkbox" checked={enabled} onChange={(e: ChangeEvent<HTMLInputElement>) => onToggle(e.target.checked)} />
        <span>{label}</span>
      </label>
      <label className="field">
        <input
          type="text"
          aria-label={label}
          value={text}
          disabled={!enabled}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onText(e.target.value)}
        />
        {hint ? <span className="field-hint">{hint}</span> : null}
      </label>
    </>
  )
}

interface DealCardPropertiesPanelProps {
  value: DealCardFields
  onChange: (next: DealCardFields) => void
}

/**
 * Panel de LA TARJETA (vista general, sin una línea puntual seleccionada).
 * Antes tenía las ~24 campos de las 7 piezas movibles acá mismo — saturaba el
 * panel derecho apenas se tocaba un deal (pedido explícito del usuario de
 * recortarlo). Ahora solo quedan los campos que NO son una de esas 7 piezas
 * (imagen/logo, enlace, legales — ninguno tiene marcador DPIECE propio en
 * ui/Viewport.tsx, así que no son seleccionables por separado en el lienzo) +
 * el catálogo de "piezas ocultas" para restablecerlas, mismo patrón que
 * `hiddenItems` en components/banner/PropertiesPanel.tsx. Los campos de cada
 * pieza viven en DealCardPiecePropertiesPanel, más abajo.
 */
export function DealCardPropertiesPanel({ value, onChange }: DealCardPropertiesPanelProps) {
  const set = <K extends keyof DealCardFields>(key: K, next: DealCardFields[K]) => {
    onChange({ ...value, [key]: next })
  }

  const hiddenPieces = DEAL_CARD_PIECE_TYPES.filter((type) => isDealCardPieceHidden(value, type))

  return (
    <div className="properties-panel">
      <p className="field-group-label">Imagen</p>
      <label className="field">
        <span>Imagen del producto</span>
        <input type="text" placeholder="https://..." value={value.productImageUrl} onChange={(e) => set('productImageUrl', e.target.value)} />
      </label>
      <label className="field">
        <span>Forma del logo</span>
        <select value={value.logoShape} onChange={(e: ChangeEvent<HTMLSelectElement>) => set('logoShape', e.target.value as DealLogoShape)}>
          {DEAL_LOGO_SHAPE_VALUES.map((shape) => (
            <option key={shape} value={shape}>
              {DEAL_LOGO_SHAPE_LABELS[shape]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Logo del comercio</span>
        <input type="text" placeholder="https://..." value={value.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} />
        <span className="field-hint">Vacío = el deal se muestra sin logo.</span>
      </label>

      <p className="field-group-label">Enlace</p>
      <label className="field">
        <span>Destino del deal</span>
        <input type="text" placeholder="https://..." value={value.link} onChange={(e) => set('link', e.target.value)} />
        <span className="field-hint">Todo el deal es clickeable — es el único módulo de contenido con enlace activo por defecto.</span>
      </label>

      <p className="field-group-label">Legales</p>
      <TogglableTextField
        label="Mostrar legales"
        enabled={value.legalEnabled}
        onToggle={(legalEnabled) => set('legalEnabled', legalEnabled)}
        text={value.legalText}
        onText={(legalText) => set('legalText', legalText)}
        hint="La fila de legales es compartida con el deal de al lado: si cualquiera de los dos la activa, aparece en ambos."
      />

      {hiddenPieces.length > 0 && (
        <div className="field">
          <span>Piezas ocultas de este deal</span>
          {hiddenPieces.map((type) => (
            <div className="field-row" key={type}>
              <span>{DEAL_CARD_PIECE_LABELS[type]}</span>
              <button type="button" onClick={() => onChange(restoreDealCardPiece(value, type))}>
                + Restablecer
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="inspector-hint">
        Tocá una línea del deal en el lienzo (línea 1, línea 2, precio, categoría/rating, tags, CTA) para ver y editar
        solo sus opciones — ahí también podés reordenarla arrastrando u ocultarla.
      </p>
    </div>
  )
}

interface DealCardPiecePropertiesPanelProps {
  pieceType: DealCardPieceType
  value: DealCardFields
  onChange: (next: DealCardFields) => void
  /** Solo para leer `doc.global.tema` (colores reales de RichTextInput en
   *  complemento2Text) — mismo motivo que BannerItemPanelProps en
   *  components/banner/items/panels.tsx recibe `doc` completo. */
  doc: EmailDocument
}

/**
 * Panel SCOPED de una sola línea/pieza de la tarjeta — lo que se ve al tocar
 * esa pieza en el lienzo (ui/InspectorPanel.tsx la resuelve antes que la vista
 * general de la tarjeta, igual que una pieza de banner se resuelve antes que
 * el banner general). Cada rama muestra solo los campos de ESA pieza (los
 * mismos que antes vivían todos juntos en DealCardPropertiesPanel).
 *
 * "Eliminar esta línea" al final apaga/vacía la pieza sin salir del panel — el
 * usuario decidió que duplicar NO aplica acá (cada una de las 7 es un slot
 * fijo del maestro, no una lista libre como los items de banner); para volver
 * a mostrarla está el catálogo de "piezas ocultas" en el panel de la tarjeta.
 */
export function DealCardPiecePropertiesPanel({ pieceType, value, onChange, doc }: DealCardPiecePropertiesPanelProps) {
  const set = <K extends keyof DealCardFields>(key: K, next: DealCardFields[K]) => {
    onChange({ ...value, [key]: next })
  }
  const colors = richTextColorsForTema(doc.global.tema)

  return (
    <div className="properties-panel">
      {pieceType === 'copy1' && (
        <label className="field">
          <span>Línea 1 (en negrita)</span>
          <input type="text" maxLength={DEALS_COPY_MAX_LENGTH} value={value.copy1} onChange={(e) => set('copy1', e.target.value)} />
          <span className="field-hint">
            {value.copy1.length}/{DEALS_COPY_MAX_LENGTH} · vacío = se quita la línea. Máximo 2 líneas en la celda.
          </span>
        </label>
      )}

      {pieceType === 'copy2' && (
        <label className="field">
          <span>Línea 2</span>
          <input type="text" maxLength={DEALS_COPY_MAX_LENGTH} value={value.copy2} onChange={(e) => set('copy2', e.target.value)} />
          <span className="field-hint">
            {value.copy2.length}/{DEALS_COPY_MAX_LENGTH} · vacío = se quita la línea.
          </span>
        </label>
      )}

      {pieceType === 'precio' && (
        <>
          <TogglableTextField
            label="Mostrar el monto con fondo (MARKDOWN)"
            enabled={value.markdownEnabled}
            onToggle={(markdownEnabled) => set('markdownEnabled', markdownEnabled)}
            text={value.markdownText}
            onText={(markdownText) => set('markdownText', markdownText)}
          />
          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={value.coronaProEnabled}
              disabled={!value.markdownEnabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('coronaProEnabled', e.target.checked)}
            />
            <span>Mostrar el ícono "Corona Pro" junto al monto</span>
          </label>
          <TogglableTextField
            label="Mostrar complemento 1 (ej. % off)"
            enabled={value.complemento1Enabled}
            onToggle={(complemento1Enabled) => set('complemento1Enabled', complemento1Enabled)}
            text={value.complemento1Text}
            onText={(complemento1Text) => set('complemento1Text', complemento1Text)}
          />
          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={value.complemento2Enabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('complemento2Enabled', e.target.checked)}
            />
            <span>Mostrar complemento 2 (precio anterior)</span>
          </label>
          <label className="field">
            <RichTextInput
              value={value.complemento2Text}
              onChange={(complemento2Text) => set('complemento2Text', complemento2Text)}
              colors={colors}
              disabled={!value.complemento2Enabled}
              showColors={false}
            />
            <span className="field-hint">El "|" que lo separa del complemento 1 es fijo, no es parte del texto.</span>
          </label>
        </>
      )}

      {pieceType === 'rating' && (
        <>
          <TogglableTextField
            label="Mostrar categoría"
            enabled={value.categoriaEnabled}
            onToggle={(categoriaEnabled) => set('categoriaEnabled', categoriaEnabled)}
            text={value.categoriaText}
            onText={(categoriaText) => set('categoriaText', categoriaText)}
          />
          <TogglableTextField
            label="Mostrar rating"
            enabled={value.ratingEnabled}
            onToggle={(ratingEnabled) => set('ratingEnabled', ratingEnabled)}
            text={value.ratingText}
            onText={(ratingText) => set('ratingText', ratingText)}
            hint="La estrella la pone el maestro, no se cambia."
          />
          <TogglableTextField
            label="Mostrar tiempo de entrega"
            enabled={value.tiempoEnabled}
            onToggle={(tiempoEnabled) => set('tiempoEnabled', tiempoEnabled)}
            text={value.tiempoText}
            onText={(tiempoText) => set('tiempoText', tiempoText)}
            hint="El reloj lo pone el maestro, no se cambia."
          />
        </>
      )}

      {pieceType === 'tag1' && (
        <>
          <TogglableTextField
            label="Mostrar tag 1"
            enabled={value.tag1Enabled}
            onToggle={(tag1Enabled) => set('tag1Enabled', tag1Enabled)}
            text={value.tag1Text}
            onText={(tag1Text) => set('tag1Text', tag1Text)}
          />
          <label className="field">
            <span>Ícono del tag 1</span>
            <input
              type="text"
              placeholder="https://..."
              value={value.tag1IconUrl}
              disabled={!value.tag1Enabled}
              onChange={(e) => set('tag1IconUrl', e.target.value)}
            />
          </label>
        </>
      )}

      {pieceType === 'tag2' && (
        <>
          <TogglableTextField
            label="Mostrar tag 2"
            enabled={value.tag2Enabled}
            onToggle={(tag2Enabled) => set('tag2Enabled', tag2Enabled)}
            text={value.tag2Text}
            onText={(tag2Text) => set('tag2Text', tag2Text)}
          />
          <label className="field">
            <span>Ícono del tag 2</span>
            <input
              type="text"
              placeholder="https://..."
              value={value.tag2IconUrl}
              disabled={!value.tag2Enabled}
              onChange={(e) => set('tag2IconUrl', e.target.value)}
            />
          </label>
        </>
      )}

      {pieceType === 'cta' && (
        <TogglableTextField
          label="Mostrar el llamado a la acción"
          enabled={value.ctaEnabled}
          onToggle={(ctaEnabled) => set('ctaEnabled', ctaEnabled)}
          text={value.ctaText}
          onText={(ctaText) => set('ctaText', ctaText)}
        />
      )}

      <button type="button" onClick={() => onChange(hideDealCardPiece(value, pieceType))}>
        Eliminar esta línea
      </button>
    </div>
  )
}
