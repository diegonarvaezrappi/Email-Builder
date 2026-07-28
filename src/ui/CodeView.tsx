// ============================================================================
// Vista de código estilo editor: numeración de líneas y resaltado de sintaxis.
//
// El texto va tal cual, en `white-space: pre` (sin envolver): el HTML nunca se
// reformatea, y así los números de línea del gutter siguen alineados con el
// código. Lo que sobresale se scrollea en horizontal, como un editor.
//
// Se pinta con <span> reales en vez de innerHTML: no hay escapado manual que
// se pueda equivocar con el propio HTML que estamos mostrando.
// ============================================================================
import { useMemo } from 'react'
import { tokenizeHtml } from './highlight'

interface CodeViewProps {
  code: string
}

export function CodeView({ code }: CodeViewProps) {
  const tokens = useMemo(() => tokenizeHtml(code), [code])
  const lineCount = useMemo(() => code.split('\n').length, [code])

  return (
    <div className="code-scroll">
      <div className="code-gutter" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, n) => (
          <span key={n}>{n + 1}</span>
        ))}
      </div>
      <pre className="code-text">
        <code>
          {tokens.map((t, n) => (
            <span key={n} className={`tk-${t.kind}`}>
              {t.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
