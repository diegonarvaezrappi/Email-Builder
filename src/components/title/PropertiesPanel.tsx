import type { EmailDocument } from '../../model'
import type { GlobalFields } from '../../global/schema'
import { GeneralFieldsPanel } from '../contentModules/GeneralFieldsPanel'
import type { TitleFields } from './schema'

interface TitlePropertiesPanelProps {
  value: TitleFields
  onChange: (next: TitleFields) => void
  doc: EmailDocument
  onChangeGlobal: (next: GlobalFields) => void
}

/**
 * Panel del bloque TITLE cuando está seleccionado el módulo entero (no una
 * molécula puntual de su área libre — esa selección abre el panel scoped de
 * ESA molécula, ver ui/InspectorPanel.tsx, mismo criterio que una pieza de
 * banner o una tarjeta de deal). Solo los 3 toggles generales: el catálogo
 * para AGREGAR moléculas vive en ui/InspectorPanel.tsx, no acá — mismo lugar
 * exacto que el botón "+ Agregar deal" de DEALS, y por el mismo motivo:
 * insertar necesita `onInsertModuleItem`, una acción del store que este
 * componente no recibe (ContentBlockDef.PropertiesPanel solo trae
 * value/onChange/doc/onChangeGlobal).
 */
export function TitlePropertiesPanel({ value, onChange }: TitlePropertiesPanelProps) {
  return (
    <div className="properties-panel">
      <GeneralFieldsPanel value={value} onChange={onChange} />
    </div>
  )
}
