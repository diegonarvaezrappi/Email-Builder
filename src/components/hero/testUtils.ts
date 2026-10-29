// ============================================================================
// Ayudas para tests que hablan del "header" o del "banner" de un documento
// como cuando eran singletons (antes del 2026-10-28, ver ./schema.ts). Los
// tests de render/store de UN banner siguen teniendo sentido tal cual: operan
// sobre el primer banner (y el primer header) del Hero.
// ============================================================================
import type { EmailDocument } from '../../model'
import type { BannerFields } from '../banner/schema'
import type { HeaderFields } from '../header/schema'
import { heroBanners, heroHeaders, type HeroPiece } from './schema'

export const bannerPieceOf = (doc: Pick<EmailDocument, 'hero'>) => {
  const banner = heroBanners(doc.hero)[0]
  if (!banner) throw new Error('el documento no tiene banners')
  return banner
}

export const headerPieceOf = (doc: Pick<EmailDocument, 'hero'>) => {
  const header = heroHeaders(doc.hero)[0]
  if (!header) throw new Error('el documento no tiene headers')
  return header
}

/** Los campos del primer banner del Hero. */
export const bannerOf = (doc: Pick<EmailDocument, 'hero'>): BannerFields => bannerPieceOf(doc).fields

/** Los campos del primer header del Hero. */
export const headerOf = (doc: Pick<EmailDocument, 'hero'>): HeaderFields => headerPieceOf(doc).fields

type LegacyDoc = Omit<EmailDocument, 'hero'> & { hero?: HeroPiece[]; banner?: BannerFields; header?: HeaderFields }

/**
 * Un documento armado a la manera de antes (`{ ...doc, banner: {...} }`): el
 * `banner`/`header` sueltos reemplazan los campos del primer banner/header del
 * Hero de base.
 */
export function legacy(input: LegacyDoc): EmailDocument {
  const { banner, header, hero: baseHero, ...rest } = input
  if (!baseHero) throw new Error('legacy(): falta el hero de base (spreadear un documento real)')
  const firstBanner = baseHero.findIndex((p) => p.type === 'BANNER')
  const firstHeader = baseHero.findIndex((p) => p.type === 'HEADER')
  const hero = baseHero.map((p, i): HeroPiece => {
    if (banner && i === firstBanner) return { ...p, type: 'BANNER', fields: banner } as HeroPiece
    if (header && i === firstHeader) return { ...p, type: 'HEADER', fields: header } as HeroPiece
    return p
  })
  return { ...rest, hero } as EmailDocument
}
