// ============================================================================
// Selector de tipo de imagen del banner HORIZONTAL — la única diferencia de su
// panel derecho vs. el banner vertical (que solo soporta IMG_FIJA, sin
// elección: IMG_AUTOMATICA_MODULO no tiene variante vertical, ver
// bannerItemRegistry.ts). "Automática" y "Alto fijo" son mutuamente
// excluyentes (components/banner/exclusivity.ts) — elegir una reemplaza a la
// otra en el store (store.ts, setBannerImageModule) EN EL MISMO ÍNDICE si ya
// había un módulo de imagen puesto, para no reordenar el resto de las piezas.
// ============================================================================
import { findImageModuleIndex, type ImageModuleType } from './exclusivity'
import type { BannerItem } from './items/schemas'

const IMAGE_TYPE_OPTIONS: { type: ImageModuleType; title: string; caption: string }[] = [
  {
    type: 'IMG_AUTOMATICA_MODULO',
    title: 'Automática',
    caption: 'La imagen se ajusta sola al espacio disponible. Usala si ya tenés la imagen con las proporciones que querés mostrar.',
  },
  {
    type: 'IMG_FIJA',
    title: 'Alto fijo',
    caption: 'La imagen ocupa siempre la misma altura, sin importar el tamaño original. Usala para que el banner se vea parejo aunque cambies la imagen.',
  },
]

interface BannerImageTypeSelectorProps {
  items: BannerItem[]
  onSelect: (type: ImageModuleType) => void
}

export function BannerImageTypeSelector({ items, onSelect }: BannerImageTypeSelectorProps) {
  const idx = findImageModuleIndex(items)
  const currentType = idx === -1 ? undefined : items[idx].type

  return (
    <div className="field">
      <span>Tipo de imagen</span>
      <ul className="image-type-grid">
        {IMAGE_TYPE_OPTIONS.map((opt) => (
          <li key={opt.type}>
            <button
              type="button"
              className={`option-card image-type-card${currentType === opt.type ? ' active' : ''}`}
              aria-pressed={currentType === opt.type}
              onClick={() => onSelect(opt.type)}
            >
              <span className="option-card-title">{opt.title}</span>
              <span className="option-card-caption">{opt.caption}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
