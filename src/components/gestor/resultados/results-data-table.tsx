import { DataTable } from '@/components/ui/data-table'
import { FileText, Download } from 'lucide-react'

export type UnifiedResult = {
  id: string
  date: string
  pointName: string
  parameterName: string
  valueDisplay: React.ReactNode
  originDisplay: React.ReactNode
  recorderName: string
  isNonConformant: boolean | null
  evidenceNode?: React.ReactNode
}

interface ResultsDataTableProps {
  data: UnifiedResult[]
}

export function ResultsDataTable({ data }: ResultsDataTableProps) {
  return (
    <DataTable
      headers={[
        'Data',
        'Ponto de Coleta',
        'Parâmetro',
        'Valor',
        'Avaliador',
        'Origem',
        <div key="status" className="text-right w-full block">Status</div>,
      ]}
      isEmpty={data.length === 0}
      emptyTitle="Nenhum resultado encontrado"
      emptyDescription="Tente limpar os filtros de busca ou status."
    >
      {data.map((r) => (
        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
          <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
          <td className="px-4 py-3 font-medium text-foreground">
            {r.pointName}
            {r.evidenceNode}
          </td>
          <td className="px-4 py-3">{r.parameterName}</td>
          <td className="px-4 py-3">{r.valueDisplay}</td>
          <td className="px-4 py-3 text-muted-foreground">{r.recorderName}</td>
          <td className="px-4 py-3">{r.originDisplay}</td>
          <td className="px-4 py-3 text-right">
            {r.isNonConformant === true ? (
              <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                FORA DO LIMITE
              </span>
            ) : r.isNonConformant === false ? (
              <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                CONFORME
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </td>
          <td className="px-4 py-3 text-right">
             {/* empty for action column in data-table */}
          </td>
        </tr>
      ))}
    </DataTable>
  )
}
