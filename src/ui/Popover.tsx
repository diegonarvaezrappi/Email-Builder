// ============================================================================
// Botón + panel flotante que se cierra al hacer click afuera. Lo usan los
// ajustes de los 3 fondos del mail (panel izquierdo) y el menú de vista del
// menú inferior (ui/BottomBar.tsx).
// ============================================================================
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface PopoverProps {
  label: ReactNode
  children: ReactNode
  /** Obligatorio cuando `label` es solo un icono. */
  ariaLabel?: string
  buttonClassName?: string
}

export function Popover({ label, children, ariaLabel, buttonClassName }: PopoverProps) {
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
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {label}
      </button>
      {open && <div className="popover-panel">{children}</div>}
    </div>
  )
}
