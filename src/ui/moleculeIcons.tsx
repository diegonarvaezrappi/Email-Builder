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
import type { BannerType } from '../components/banner/schema'
import type { ModuleItemType } from '../moduleItems/schemas'

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
 *  molecula_texto_complementario_*.html (un <h2> de cuerpo, no un titular). */
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

/** Una sola línea horizontal fina y corta, centrada — mirror de
 *  molecula_separadores.html: un <div> vacío de altura fija, sin texto ni
 *  ícono. */
export function SeparadorIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <line x1="16" y1="20" x2="48" y2="20" stroke="currentColor" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
    </svg>
  )
}

/** Fila de círculos pequeños lado a lado — mirror de
 *  content_moleculas/molecula_franja_logos.html (N logos circulares en fila,
 *  a diferencia de las 3 píldoras rectangulares de TagsIcon). */
export function FranjaLogosIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="14" cy="20" r="8" fill="currentColor" opacity="0.7" />
      <circle cx="32" cy="20" r="8" fill="currentColor" opacity="0.7" />
      <circle cx="50" cy="20" r="8" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

/** Línea de texto + una píldora chica al lado — mirror de
 *  molecula_texto_pastilla.html (texto + tag). */
export function TextoPastillaIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="6" y="16" width="28" height="8" rx="4" fill="currentColor" opacity="0.85" />
      <rect x="38" y="14" width="20" height="12" rx="6" fill="currentColor" opacity="0.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** Silueta portrait (una sola columna, contenido apilado) — mirror de
 *  big-banner-vertical.html: la tabla "MODULO MOLECULAS" ocupa todo el ancho
 *  y las piezas se apilan una sobre otra en un único <td>. */
export function BannerVerticalIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="18" y="3" width="28" height="34" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="24" y="9" width="16" height="6" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="24" y="19" width="16" height="4" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="24" y="27" width="16" height="4" rx="2" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

/** Silueta landscape partida en 2 columnas — mirror de
 *  big-banner-horizontal.html: columna izquierda de 240px para la tabla
 *  "MODULO MOLECULAS" + columna derecha para el módulo de imagen. */
export function BannerHorizontalIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4" y="8" width="56" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
      <line x1="32" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <rect x="9" y="14" width="18" height="6" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="36" y="13" width="20" height="14" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

export const BANNER_TYPE_ICONS: Record<BannerType, ComponentType<IconProps>> = {
  vertical: BannerVerticalIcon,
  horizontal: BannerHorizontalIcon,
}

/** Título grueso + una línea fina abajo — mirror de modulo-titulo.html: un
 *  <h2> corto (título), no un párrafo largo como TextoComplementarioIcon. */
export function TituloTextoIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="8" y="12" width="36" height="10" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="8" y="26" width="24" height="4" rx="2" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

/** 2 líneas finas de párrafo, más chicas que TituloTextoIcon — mirror del
 *  <h3> subtítulo de modulo-titulo.html. */
export function SubtituloTextoIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="8" y="14" width="48" height="5" rx="2.5" fill="currentColor" opacity="0.7" />
      <rect x="8" y="23" width="34" height="5" rx="2.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

/** Línea corta con color de acento — mirror de molecula_separador_s.html (la
 *  línea decorativa, NO el espaciador invisible de SeparadorIcon). */
export function SeparadorLineaIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <line x1="18" y1="20" x2="46" y2="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** Íconos de las moléculas del área libre de un módulo de body
 *  (bodyMoleculeRegistry.ts) — 3 nuevos (TITULO_TEXTO/SUBTITULO_TEXTO/SEPARADOR_LINEA)
 *  + los mismos 3 componentes que ya usa MOLECULE_ICONS para SEPARADOR/
 *  FRANJA_LOGOS/TEXTO_PASTILLA (misma molécula, reusada tal cual). */
export const MODULE_ITEM_ICONS: Record<ModuleItemType, ComponentType<IconProps>> = {
  TITULO_TEXTO: TituloTextoIcon,
  SUBTITULO_TEXTO: SubtituloTextoIcon,
  SEPARADOR_LINEA: SeparadorLineaIcon,
  SEPARADOR: SeparadorIcon,
  FRANJA_LOGOS: FranjaLogosIcon,
  TEXTO_PASTILLA: TextoPastillaIcon,
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
  SEPARADOR: SeparadorIcon,
  FRANJA_LOGOS: FranjaLogosIcon,
  TEXTO_PASTILLA: TextoPastillaIcon,
}
