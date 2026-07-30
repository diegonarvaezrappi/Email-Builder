/** Wrapper de una línea sobre crypto.randomUUID() — existe para poder mockearlo en tests (asserts deterministas sobre ids). */
export function newId(): string {
  return crypto.randomUUID()
}
