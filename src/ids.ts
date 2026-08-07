/**
 * Wrapper sobre crypto.randomUUID() — existe para poder mockearlo en tests
 * (asserts deterministas sobre ids).
 *
 * `crypto.randomUUID()` solo existe en "contextos seguros" (HTTPS o
 * localhost) — el navegador ni siquiera expone la función fuera de esos
 * casos. El staging de esta app se sirve por HTTP plano sobre una IP
 * (http://178.104.225.166:8092), que NO es un contexto seguro: ahí
 * `crypto.randomUUID` es `undefined` y esta función lanzaba un TypeError en
 * cuanto se agregaba cualquier bloque/tarjeta nueva (headers, banner, DEALS)
 * — funcionaba en local (`npm run dev` en localhost, sí es seguro) pero no
 * en el servidor. `crypto.getRandomValues` sí está disponible en contextos
 * inseguros, así que se arma el UUID v4 a mano con eso cuando
 * `randomUUID` no existe.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
