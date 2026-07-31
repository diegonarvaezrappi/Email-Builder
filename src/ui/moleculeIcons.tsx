// ============================================================================
// Un ícono SVG esquemático por cada uno de los 10 BannerItemType — no son
// miniaturas del HTML/CSS real, son diagramas simplificados (rectángulos,
// líneas de texto, píldoras) proporcionados a mano según la estructura real de
// cada .html en 02-components/02_banners/banner_moleculas/, para que el
// usuario del catálogo (components/banner/ItemCatalog.tsx) relacione de un
// vistazo el ícono con lo que esa pieza va a poner en el banner.
//
// Convención para toda pieza nueva que se agregue a bannerItemRegistry.ts a
// futuro: sumar acá su propio ícono (mismo viewBox, mismo criterio de
// currentColor) y su entrada en MOLECULE_ICONS — es un campo opcional
// (BannerItemDef.Icon), así que una pieza sin ícono todavía no rompe nada,
// solo se ve sin imagen en el catálogo.
// ============================================================================
import type { ComponentType, SVGProps } from 'react'
import type { BannerItemType } from '../components/banner/items/schemas'

type IconProps = SVGProps<SVGSVGElement>

const svgProps = (props: IconProps): IconProps => ({
  viewBox: '0 0 64 40',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
  ...props,
})

/** Chip redondeado con un label vertical fino ("Ahora") + un número grande —
 *  mirror de molecula_promo_*.html (tabla bgcolor con 2 <td>). */
export function PromoIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4" y="8" width="56" height="24" rx="6" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="14" width="4" height="12" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="20" y="13" width="32" height="14" rx="4" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

/** Mismo chip que Promo, pero 2 líneas apiladas (monto + "DE REINTEGRO") en
 *  vez de label+número lado a lado — mirror de molecula_creditos_*.html. */
export function CreditosIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4" y="8" width="56" height="24" rx="6" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="13" width="40" height="8" rx="4" fill="currentColor" opacity="0.85" />
      <rect x="16" y="24" width="32" height="4" rx="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

/** Una sola línea de texto grande, sin chip — molecula_textoxl_*.html. */
export function TextoXlIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="6" y="15" width="52" height="10" rx="5" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

/** Igual familia que XL pero visiblemente más fina/corta — molecula_textom_*.html. */
export function TextoMIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="14" y="17" width="36" height="6" rx="3" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

/** 3 líneas finas apiladas, ancho decreciente — forma de párrafo — mirror de
 *  modulo_texto_complementario.html (un <h4> de cuerpo, no un titular). */
export function TextoComplementarioIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="8" y="10" width="48" height="4" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="8" y="18" width="40" height="4" rx="2" fill="currentColor" opacity="0.6" />
      <rect x="8" y="26" width="28" height="4" rx="2" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

/** Glifo genérico de "imagen" (rectángulo + sol + montaña) dentro de la tabla
 *  de moléculas — mirror de molecula_img_automatica_*.html (ancho variable). */
export function ImgAutomaticaMoleculaIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="6" y="8" width="52" height="24" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.7" />
      <path d="M10 28 L24 18 L34 26 L44 16 L54 28" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </svg>
  )
}

/** Píldora tipo botón con una línea de texto centrada — mirror de
 *  cta-template.html (el mismo botón, embebido en el banner). */
export function CtaInternoIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="10" y="12" width="44" height="16" rx="8" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="18" width="24" height="4" rx="2" fill="currentColor" opacity="0.9" />
    </svg>
  )
}

/** Rectángulo más cuadrado/alto (altura fija) + un chip de logo redondeado
 *  superpuesto en la esquina — mirror de modulo_img_altofijo_*.html
 *  (background-image + <div><img> de logo con padding). */
export function ImgFijaIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="8" y="6" width="48" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="10" width="10" height="10" rx="3" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

/** Misma familia que ImgAutomaticaMoleculaIcon pero a todo el ancho (sin
 *  márgenes), para leerse como el módulo dedicado del banner horizontal, no
 *  como una pieza más de la tabla de moléculas — modulo_img_automatica_horizontal.html. */
export function ImgAutomaticaModuloIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="2" y="8" width="60" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="16" r="3" fill="currentColor" opacity="0.7" />
      <path d="M6 28 L20 18 L30 26 L40 16 L58 28" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </svg>
  )
}

/** 3 píldoras chicas separadas, lado a lado — mirror de modulo_tags_*.html
 *  (3 <td> "pill" dentro de una tabla interna). */
export function TagsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4" y="16" width="16" height="10" rx="5" fill="currentColor" opacity="0.7" />
      <rect x="24" y="16" width="16" height="10" rx="5" fill="currentColor" opacity="0.7" />
      <rect x="44" y="16" width="16" height="10" rx="5" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

export const MOLECULE_ICONS: Record<BannerItemType, ComponentType<IconProps>> = {
  PROMO: PromoIcon,
  CREDITOS: CreditosIcon,
  TEXTOXL: TextoXlIcon,
  TEXTOM: TextoMIcon,
  TEXTO_COMPLEMENTARIO: TextoComplementarioIcon,
  IMG_AUTOMATICA_MOLECULA: ImgAutomaticaMoleculaIcon,
  CTA_INTERNO: CtaInternoIcon,
  IMG_FIJA: ImgFijaIcon,
  IMG_AUTOMATICA_MODULO: ImgAutomaticaModuloIcon,
  TAGS: TagsIcon,
}
