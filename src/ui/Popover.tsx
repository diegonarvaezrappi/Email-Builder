// ============================================================================
// Botón + panel flotante que se cierra al hacer click afuera — primer uso:
// BackgroundSettingsPanel (los 3 fondos del mail, General/Hero/Contenidos),
// que no tienen ningún componente de canvas al cual anclar su propio panel de
// propiedades (a diferencia de Header/Banner/Footer/Contenidos, seleccionables
// en el lienzo).
// ============================================================================
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface PopoverProps {
  label: string
  children: ReactNode
}

export function Popover({ label, children }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div className="popover" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {label}
      </button>
      {open && <div className="popover-panel">{children}</div>}
    </div>
  )
}
