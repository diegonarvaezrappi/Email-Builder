import type { ChangeEvent } from 'react'
import type { EmailDocument } from '../../../model'
import { CTA_STYLE_SELECT_LABELS, CTA_STYLE_SELECT_VALUES } from '../../../global/schema'
import type { GlobalFields } from '../../../global/schema'
import { RichTextInput } from '../../../richText/RichTextInput'
import type { RichTextColorMap } from '../../../richText/model'
import { themeVars } from '../../../themes/themes'
import {
  CREDITOS_VARIANT_LABELS,
  CREDITOS_VARIANT_VALUES,
  defaultFranjaLogoItem,
  defaultTagItem,
  FRANJA_LOGOS_SIZE_LABELS,
  FRANJA_LOGOS_SIZE_VALUES,
  SEPARADOR_SIZE_LABELS,
  SEPARADOR_SIZE_VALUES,
  TEXTO_PASTILLA_POSITION_LABELS,
  TEXTO_PASTILLA_POSITION_VALUES,
} from './schemas'
import type {
  CreditosFields,
  CtaInternoFields,
  FranjaLogoItem,
  FranjaLogosFields,
  ImgAutomaticaModuloFields,
  ImgAutomaticaMoleculaFields,
  ImgFijaFields,
  PromoFields,
  SeparadorFields,
  TagItem,
  TagsFields,
  TextoComplementarioFields,
  TextoMFields,
  TextoPastillaFields,
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
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.borderRadiusEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, borderRadiusEnabled: e.target.checked })}
        />
        <span>Esquinas redondeadas</span>
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
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={value.borderRadiusEnabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, borderRadiusEnabled: e.target.checked })}
        />
        <span>Esquinas redondeadas</span>
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

export function SeparadorPropertiesPanel({ value, onChange }: BannerItemPanelProps<SeparadorFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Tamaño</span>
        <select value={value.size} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ size: e.target.value as SeparadorFields['size'] })}>
          {SEPARADOR_SIZE_VALUES.map((s) => (
            <option key={s} value={s}>
              {SEPARADOR_SIZE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function TextoPastillaPropertiesPanel({ value, onChange }: BannerItemPanelProps<TextoPastillaFields>) {
  return (
    <div className="properties-panel">
      <label className="field">
        <span>Texto</span>
        <input type="text" value={value.text} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, text: e.target.value })} />
      </label>
      <label className="field">
        <span>Texto de la pastilla</span>
        <input type="text" value={value.pillText} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, pillText: e.target.value })} />
      </label>
      <label className="field">
        <span>Posición de la pastilla</span>
        <select
          value={value.pillPosition}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, pillPosition: e.target.value as TextoPastillaFields['pillPosition'] })}
        >
          {TEXTO_PASTILLA_POSITION_VALUES.map((p) => (
            <option key={p} value={p}>
              {TEXTO_PASTILLA_POSITION_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function FranjaLogosPropertiesPanel({ value, onChange }: BannerItemPanelProps<FranjaLogosFields>) {
  const setLogo = (index: number, patch: Partial<FranjaLogoItem>) => {
    onChange({ ...value, logos: value.logos.map((l, i) => (i === index ? { ...l, ...patch } : l)) })
  }
  const addLogo = () => {
    if (value.logos.length >= 10) return
    onChange({ ...value, logos: [...value.logos, defaultFranjaLogoItem()] })
  }
  const removeLogo = (index: number) => {
    if (value.logos.length <= 1) return
    onChange({ ...value, logos: value.logos.filter((_, i) => i !== index) })
  }

  return (
    <div className="properties-panel">
      <label className="field">
        <span>Tamaño (aplica a todos los logos)</span>
        <select
          value={value.size}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, size: e.target.value as FranjaLogosFields['size'] })}
        >
          {FRANJA_LOGOS_SIZE_VALUES.map((s) => (
            <option key={s} value={s}>
              {FRANJA_LOGOS_SIZE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {value.logos.map((logo, index) => (
        <div key={index}>
          <p className="field-group-label">Logo {index + 1}</p>
          <label className="field">
            <span>URL de la imagen</span>
            <div className="field-row">
              <input type="text" value={logo.imageUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setLogo(index, { imageUrl: e.target.value })} />
              {value.logos.length > 1 && (
                <button type="button" onClick={() => removeLogo(index)} aria-label={`Eliminar logo ${index + 1}`}>
                  ×
                </button>
              )}
            </div>
          </label>
          <label className="field">
            <span>Enlace</span>
            <input
              type="text"
              placeholder="https://..."
              value={logo.link}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLogo(index, { link: e.target.value })}
            />
          </label>
        </div>
      ))}
      {value.logos.length < 10 && (
        <button type="button" onClick={addLogo}>
          + Agregar logo
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
          {CTA_STYLE_SELECT_VALUES.map((s) => (
            <option key={s} value={s}>
              {CTA_STYLE_SELECT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
