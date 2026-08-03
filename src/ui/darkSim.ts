// ============================================================================
// Simulación de "cliente de correo con dark mode" sobre el email del preview.
//
// Vive aparte de ui/Viewport.tsx porque es autocontenida y la paridad de
// filtros anidados (ver DARK_SIM_CSS) es lo bastante delicada como para
// leerse sola. Es un ajuste de VISTA: opera sobre el DOM ya renderizado dentro
// del iframe y JAMÁS toca el HTML que se exporta.
// ============================================================================

/**
 * Cómo se ve el email en el "cliente de correo" simulado — Claro (el mail tal
 * cual, sin tocar) u Oscuro (como lo dejaría un cliente con dark mode
 * activado: el repo no trae NINGÚN soporte nativo de dark mode para el email
 * — sin `prefers-color-scheme`, sin `color-scheme`, sin los selectores que usa
 * Gmail — así que un cliente con dark mode encendido no "respeta" nada del
 * mail, lo auto-oscurece él mismo con su propio algoritmo, como hacen Gmail,
 * Outlook y Apple Mail con cualquier correo sin soporte explícito).
 *
 * Es un ajuste de VISTA, nunca del documento: no entra al historial de
 * undo/redo, no se persiste, y jamás toca el HTML exportado.
 */
export type EmailClientScheme = 'light' | 'dark'

/** Filtro de auto-oscurecido. Se usa varias veces; ver DARK_SIM_CSS. */
const DARK_SIM_FILTER = 'invert(1) hue-rotate(180deg)'

const DARK_SIM_STYLE_ID = 'email-builder-dark-sim'

/** Atributo que markBgCarriers() pone en los `<td>/<tr>` con imagen de fondo.
 *  Solo existe en el DOM del iframe, nunca en el HTML que se exporta. */
export const DARK_SIM_BG_ATTR = 'data-dark-sim-bg'

/**
 * La simulación de "cliente con dark mode": se invierte el documento entero y
 * se vuelve a invertir SOLO el contenido multimedia, con lo que las imágenes
 * quedan a color normal. Es lo que hacen Gmail/Outlook/Apple Mail y los
 * simuladores de dark mode: oscurecen fondos y textos, pero no tocan las fotos
 * ni los logos.
 *
 * Las imágenes de fondo (`background-image`) también hay que exceptuarlas —
 * fondo del banner, hero IMG_FIJA, "bigote" del footer, fondos de header — pero
 * NO se puede con un `[style*="background-image"]` a secas: `filter` cascadea a
 * todo el subárbol y en este maestro ningún portador es decorativo aislado, todos
 * son `<td>/<tr>` con contenido dentro. En particular el `<td>` de
 * template_base.html:990 (fondo de página) envuelve el email COMPLETO: ese
 * selector re-invertiría todo y anularía la simulación.
 *
 * La solución es compensar el portador Y devolver sus hijos directos a la
 * apariencia oscura — los filtros anidados se multiplican, así que un número
 * PAR de inversiones sobre un elemento lo deja en su color original y un número
 * IMPAR lo deja oscurecido. De ahí las 3 reglas:
 *
 *  1. el portador se invierte  -> nº par sobre él -> su fondo sale a color real
 *  2. sus hijos directos se re-invierten -> nº impar -> el contenido sigue oscuro
 *  3. un `<img>` hijo DIRECTO de un portador ya va en nº par por la regla 1, así
 *     que se le quita el filtro; si no, la regla 2 lo dejaría en impar (oscuro).
 *     Un `<img>` más profundo no necesita excepción: la regla 2 ya le aportó una
 *     inversión intermedia, y la regla de `img` le suma la que le falta.
 *
 * Qué elementos son "portadores" no se decide acá con selectores del maestro
 * (sus clases ya cambiaron una vez, ver scripts/sync-master.mjs): los marca
 * markBgCarriers() en tiempo de ejecución leyendo el estilo computado.
 *
 * Por qué `invert(1) hue-rotate(180deg)` y no `invert(1)` a secas: sin el
 * hue-rotate los tonos se van al color complementario (un link azul sale
 * amarillo y el naranja de marca sale cian). Con él los matices se conservan.
 * El precio es que el hue-rotate recorta los valores fuera de gama, así que la
 * doble inversión no es exactamente idéntica al original (los colores muy
 * saturados pierden algo de saturación, y el efecto se acumula en los
 * anidamientos profundos) — se comparó contra `invert(1)` puro, que devuelve la
 * imagen exacta pero rompe todos los tonos del resto, y esta es la mejor de las dos.
 *
 * Va DENTRO del documento del iframe: es la única forma de exceptuar las
 * imágenes, porque un filtro puesto en el elemento <iframe> se aplica al
 * resultado ya rasterizado y no distingue su contenido.
 *
 * El `background-color` explícito en `html` evita depender de la propagación
 * del fondo de `body` al canvas, que no queda cubierta por el filtro.
 */
export const DARK_SIM_CSS = [
  `html{filter:${DARK_SIM_FILTER};background-color:#ffffff}`,
  `img,picture,video,svg{filter:${DARK_SIM_FILTER}}`,
  `[${DARK_SIM_BG_ATTR}]{filter:${DARK_SIM_FILTER}}`,
  `[${DARK_SIM_BG_ATTR}]>*{filter:${DARK_SIM_FILTER}}`,
  `[${DARK_SIM_BG_ATTR}]>img,[${DARK_SIM_BG_ATTR}]>picture,[${DARK_SIM_BG_ATTR}]>video,[${DARK_SIM_BG_ATTR}]>svg{filter:none}`,
].join('')

/**
 * ¿El `background-image` computado apunta a una imagen de verdad?
 *
 * Importa porque el maestro deja varios `url({{var}})` que el tema puede
 * resolver a vacío, y ante un `url()` vacío el navegador reporta la URL del
 * propio documento (`about:srcdoc` en el iframe, la del archivo si se abre
 * suelto) en vez de `none`. Marcar uno de esos sería peor que no hacer nada: el
 * `<td>` no tiene imagen que corregir pero sí un `bgcolor` sólido, que saldría
 * sin invertir — claro sobre un mail oscuro.
 */
function hasRealBackgroundImage(el: Element, view: Window & typeof globalThis): boolean {
  if (el.hasAttribute('background')) return true
  const bg = view.getComputedStyle(el).backgroundImage
  if (!bg || bg === 'none') return false
  const urls = bg.match(/url\((?:"|')?(.*?)(?:"|')?\)/g) ?? []
  return urls.some((raw) => {
    const url = raw.replace(/^url\((?:"|')?/, '').replace(/(?:"|')?\)$/, '')
    return url !== '' && url !== el.ownerDocument.URL
  })
}

/**
 * Marca los `<td>/<tr>` que llevan una imagen de fondo, para que DARK_SIM_CSS
 * los compense sin arrastrar su contenido (ver ahí el detalle de las 3 reglas).
 *
 * Se detectan por estilo computado y no por selector del maestro para que la
 * simulación no se rompa cuando el repo fuente reestructure clases o mueva
 * archivos. Dos exclusiones, que son las que hacen que esto funcione:
 *
 *  - **Wrappers de página.** Los 2 `<td>` de template_base.html envuelven el
 *    email entero; compensarlos equivale a apagar la simulación. Se reconocen
 *    porque contienen al `[role="paddedcontainer"]` (el contenedor de
 *    header/banner/contenidos/cierre), cosa que ningún portador real hace.
 *  - **Portadores en padre-hijo DIRECTO.** Un elemento solo puede tener un
 *    `filter`, así que si dos portadores anidados directamente se marcan, el
 *    interior queda en nº impar y su fondo sale invertido igual. Pasa de verdad
 *    en modulo_img_altofijo_*.html (`<tr>` con overlay > `<td>` con la foto):
 *    se conserva el descendiente, que es el que trae la imagen que importa.
 *    Anidamientos indirectos (banner > ... > IMG_FIJA) sí funcionan: la regla 2
 *    aporta la inversión intermedia que mantiene la paridad.
 *
 * Idempotente: se puede llamar en cada sync del iframe (el HTML del mail cambia
 * y con él los portadores), y limpia las marcas que quedaron obsoletas.
 */
export function markBgCarriers(root: Document): void {
  const view = root.defaultView
  if (!root.body || !view) return

  const paddedContainer = root.querySelector('[role="paddedcontainer"]')
  const carriers = new Set<Element>()

  for (const el of Array.from(root.body.querySelectorAll('*'))) {
    if (!hasRealBackgroundImage(el, view)) continue
    if (paddedContainer && el.contains(paddedContainer)) continue
    carriers.add(el)
  }

  for (const el of Array.from(carriers)) {
    if (el.parentElement && carriers.has(el.parentElement)) carriers.delete(el.parentElement)
  }

  for (const el of Array.from(root.querySelectorAll(`[${DARK_SIM_BG_ATTR}]`))) {
    if (!carriers.has(el)) el.removeAttribute(DARK_SIM_BG_ATTR)
  }
  for (const el of carriers) el.setAttribute(DARK_SIM_BG_ATTR, '')
}

/** Prende o apaga la simulación en el documento del iframe (sin recargarlo). */
export function applyClientScheme(root: Document, scheme: EmailClientScheme): void {
  const existing = root.getElementById(DARK_SIM_STYLE_ID)
  if (scheme === 'light') {
    existing?.remove()
    for (const el of Array.from(root.querySelectorAll(`[${DARK_SIM_BG_ATTR}]`))) {
      el.removeAttribute(DARK_SIM_BG_ATTR)
    }
    return
  }
  if (!existing) {
    const style = root.createElement('style')
    style.id = DARK_SIM_STYLE_ID
    style.textContent = DARK_SIM_CSS
    ;(root.head ?? root.documentElement).appendChild(style)
  }
  // Re-marcar siempre (no solo al inyectar el <style>): syncFrame corre también
  // cuando cambia el HTML del mail, y ahí los portadores son otros elementos.
  markBgCarriers(root)
}
