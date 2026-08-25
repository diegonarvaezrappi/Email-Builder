import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../../model'
import { CTA_STYLE_LABELS, CTA_STYLE_VALUES } from '../../../global/schema'
import type { GlobalFields } from '../../../global/schema'
import { RichTextInput } from '../../../richText/RichTextInput'
import type { RichTextColorMap } from '../../../richText/model'
import { themeVars } from '../../../themes/themes'
import { CREDITOS_VARIANT_LABELS, CREDITOS_VARIANT_VALUES, defaultTagItem } from './schemas'
import type {
  CreditosFields,
  CtaInternoFields,
  ImgAutomaticaModuloFields,
  ImgAutomaticaMoleculaFields,
  ImgFijaFields,
  PromoFields,
  TagItem,
  TagsFields,
  TextoComplementarioFields,
  TextoMFields,
  TextoXlFields,
} from './schemas'

/** Colores reales del tema activo para la vista previa del editor de texto
 *  enriquecido (RichTextInput) — a diferencia del HTML final del banner, que
 *  deja `{{color_x_mail_general}}` sin resolver hasta la pasada de tema de
 *  components/banner/render.ts, acá el usuario necesita ver el color de
 *  verdad mientras escribe. */
function richTextColorsForTema(tema: string): RichTextColorMap {
  const vars = themeVars(tema)
  return {
    colorBase: vars.color_texto_mail_general ?? '#000000',
    colorAcento1: vars.color_acento1_mail_general ?? '#000000',
    colorAcento2: vars.color_acento2_mail_general ?? '#000000',
  }
}

/** Props uniformes para todo `BannerItemDef.PropertiesPanel` — mismo shape
 *  que `ContentBlockDef.PropertiesPanel` (CTA de CONTENIDOS): `doc`/`onChangeGlobal`
 *  existen porque CTA_INTERNO necesita leer/escribir doc.global.ctaStyle, y
 *  IMG_FIJA necesita saber doc.banner.bannerType (el campo `logoLink` solo
 *  aplica en vertical). Los demás tipos simplemente no los usan. */
interface BannerItemPanelProps<TFields> {
  value: TFields
  onChange: (next: TFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

export function PromoPropertiesPanel({ value, onChange, doc }: BannerItemPanelProps<PromoFields>) {
  const colors = richTextColorsForTema(doc.global.tema)
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Monto de la promo</span>
        <RichTextInput value={value.promoText} onChange={(promoText) => onChange({ ...value, promoText })} colors={colors} showColors={false} />
        <span className="field-hint">El tamaño de letra se ajusta solo según el largo del texto.</span>
      </label>
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.ahoraEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, ahoraEnabled: e.target.checked })}
        />
        <span>Mostrar el texto "Ahora"</span>
      </label>
      <label className="field">
        <span>Texto de "Ahora"</span>
        <RichTextInput
          value={value.ahoraText}
          onChange={(ahoraText) => onChange({ ...value, ahoraText })}
          colors={colors}
          disabled={!value.ahoraEnabled}
          showColors={false}
        />
      </label>
    </div>
  )
}

export function CreditosPropertiesPanel({ value, onChange, doc }: BannerItemPanelProps<CreditosFields>) {
  const colors = richTextColorsForTema(doc.global.tema)
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Créditos</span>
        <RichTextInput value={value.creditosText} onChange={(creditosText) => onChange({ ...value, creditosText })} colors={colors} showColors={false} />
      </label>
      <label className="field">
        <span>Variante de color</span>
        <select
          value={value.variant}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, variant: e.target.value as CreditosFields['variant'] })}
        >
          {CREDITOS_VARIANT_VALUES.map((v) => (
            <option key={v} value={v}>
              {CREDITOS_VARIANT_LABELS[v]}
            </option>
          ))}
        </select>
      </label>
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.deReintegroEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, deReintegroEnabled: e.target.checked })}
        />
        <span>Mostrar el texto "DE REINTEGRO"</span>
      </label>
      <label className="field">
        <span>Texto de "DE REINTEGRO"</span>
        <RichTextInput
          value={value.deReintegroText}
          onChange={(deReintegroText) => onChange({ ...value, deReintegroText })}
          colors={colors}
          disabled={!value.deReintegroEnabled}
          showColors={false}
        />
      </label>
    </div>
  )
}

export function TextoXlPropertiesPanel({ value, onChange, doc }: BannerItemPanelProps<TextoXlFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto XL</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
      </label>
    </div>
  )
}

export function TextoMPropertiesPanel({ value, onChange, doc }: BannerItemPanelProps<TextoMFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto M</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
      </label>
    </div>
  )
}

export function TextoComplementarioPropertiesPanel({ value, onChange, doc }: BannerItemPanelProps<TextoComplementarioFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto complementario</span>
        <RichTextInput value={value.text} onChange={(text) => onChange({ text })} colors={richTextColorsForTema(doc.global.tema)} />
      </label>
    </div>
  )
}

export function ImgAutomaticaMoleculaPropertiesPanel({ value, onChange }: BannerItemPanelProps<ImgAutomaticaMoleculaFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>URL de la imagen</span>
        <input
          type="text"
          value={value.imageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Ancho (%)</span>
        <input
          type="number"
          min={1}
          max={100}
          value={value.widthPercent}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, widthPercent: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}

export function ImgAutomaticaModuloPropertiesPanel({ value, onChange }: BannerItemPanelProps<ImgAutomaticaModuloFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>URL de la imagen</span>
        <input
          type="text"
          value={value.imageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, imageUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Ancho (%)</span>
        <input
          type="number"
          min={1}
          max={100}
          value={value.widthPercent}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, widthPercent: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}

export function ImgFijaPropertiesPanel({ value, onChange, doc }: BannerItemPanelProps<ImgFijaFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Imagen de fondo</span>
        <input
          type="text"
          value={value.heroImageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, heroImageUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Logo</span>
        <input
          type="text"
          value={value.logoImageUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, logoImageUrl: e.target.value })}
        />
      </label>
      {doc.banner.bannerType === 'vertical' && (
        <label className="field">
          <span>Enlace del logo</span>
          <input
            type="text"
            placeholder="https://..."
            value={value.logoLink}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, logoLink: e.target.value })}
          />
        </label>
      )}
    </div>
  )
}

export function TagsPropertiesPanel({ value, onChange }: BannerItemPanelProps<TagsFields>) {
  const setTag = (index: number, patch: Partial<TagItem>) => {
    onChange({ tags: value.tags.map((t, i) => (i === index ? { ...t, ...patch } : t)) })
  }
  const addTag = () => {
    if (value.tags.length >= 3) return
    onChange({ tags: [...value.tags, defaultTagItem('tag')] })
  }
  const removeTag = (index: number) => {
    if (value.tags.length <= 1) return
    onChange({ tags: value.tags.filter((_, i) => i !== index) })
  }

  return (
    <div className="properties-panel">
      {value.tags.map((tag, index) => (
        <div key={index}>
          <p className="field-group-label">Tag {index + 1}</p>
          <label className="field">
            <span>Texto</span>
            <div className="field-row">
              <input type="text" value={tag.text} onChange={(e: ChangeEvent<HTMLInputElement>) => setTag(index, { text: e.target.value })} />
              {value.tags.length > 1 && (
                <button type="button" onClick={() => removeTag(index)} aria-label={`Eliminar tag ${index + 1}`}>
                  ×
                </button>
              )}
            </div>
          </label>
          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={tag.iconEnabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTag(index, { iconEnabled: e.target.checked })}
            />
            <span>Mostrar ícono</span>
          </label>
          <label className="field">
            <span>URL del ícono</span>
            <input
              type="text"
              placeholder="https://..."
              value={tag.iconUrl}
              disabled={!tag.iconEnabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTag(index, { iconUrl: e.target.value })}
            />
          </label>
        </div>
      ))}
      {value.tags.length < 3 && (
        <button type="button" onClick={addTag}>
          + Agregar tag
        </button>
      )}
    </div>
  )
}

export function CtaInternoPropertiesPanel({ value, onChange, doc, onChangeGlobal }: BannerItemPanelProps<CtaInternoFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto del botón</span>
        <input
          type="text"
          maxLength={60}
          value={value.text}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, text: e.target.value })}
        />
        <span className="field-hint">{value.text.length}/35 (se trunca automáticamente)</span>
      </label>
      <label className="field">
        <span>Enlace</span>
        <input
          type="text"
          placeholder="https://..."
          value={value.deeplink}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, deeplink: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Estilo del botón (aplica a TODOS los CTA del mail)</span>
        <select
          value={doc.global.ctaStyle}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChangeGlobal({ ...doc.global, ctaStyle: e.target.value as GlobalFields['ctaStyle'] })}
        >
          {CTA_STYLE_VALUES.map((s) => (
            <option key={s} value={s}>
              {CTA_STYLE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
