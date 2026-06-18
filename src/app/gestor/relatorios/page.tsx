'use client'

import { useState } from 'react'
import { getReportData } from './actions'
import { FileText, Printer, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // First day of current month
    return d.toISOString().split('T')[0]
  })
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getReportData(startDate, endDate)
      if (result.success) {
        setReport(result.data)
      } else {
        setError("Erro ao gerar relatório.")
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-950 print:bg-white print:text-black p-4 sm:p-6 lg:p-8">
      {/* HEADER CONTROLS - Hidden when printing */}
      <div className="print:hidden mb-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Relatórios de Conformidade
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gere o documento oficial consolidado de qualidade e ocorrências.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-400 mb-1">Data Inicial</label>
            <input 
              type="date" 
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-400 mb-1">Data Final</label>
            <input 
              type="date" 
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg transition-all"
          >
            {loading ? 'Consultando...' : 'Gerar Dados'}
          </button>
          
          {report && (
            <button 
              onClick={handlePrint}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
          )}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* REPORT CONTENT - Formatted for Print */}
      {report && (
        <div className="print:block max-w-4xl mx-auto bg-slate-900 print:bg-transparent rounded-xl border border-slate-800 print:border-none p-6 print:p-0 shadow-xl print:shadow-none">
          
          {/* Print Header */}
          <div className="border-b border-slate-700 print:border-black pb-6 mb-6">
            <h1 className="text-3xl font-bold text-white print:text-black mb-2">Relatório de Conformidade Ambiental</h1>
            <div className="flex items-center gap-2 text-slate-400 print:text-gray-700 text-sm">
              <Calendar className="w-4 h-4" />
              Período: {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
            </div>
            <p className="text-slate-500 print:text-gray-600 text-xs mt-2">Documento gerado pelo sistema Solentis - Gerenciamento Hídrico.</p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-slate-950 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-slate-400 print:text-gray-600 uppercase font-semibold">Leituras</div>
              <div className="text-2xl font-bold text-white print:text-black mt-1">{report.totalReadings}</div>
            </div>
            <div className="p-4 bg-red-950/20 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-red-400 print:text-gray-600 uppercase font-semibold">Fora do Padrão</div>
              <div className="text-2xl font-bold text-red-500 print:text-black mt-1">{report.totalNonConformant}</div>
            </div>
            <div className="p-4 bg-slate-950 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-slate-400 print:text-gray-600 uppercase font-semibold">Ocorrências</div>
              <div className="text-2xl font-bold text-white print:text-black mt-1">{report.occurrences.length}</div>
            </div>
            <div className="p-4 bg-emerald-950/20 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-emerald-400 print:text-gray-600 uppercase font-semibold">SLA no Prazo</div>
              <div className="text-2xl font-bold text-emerald-500 print:text-black mt-1">{report.sla.complianceRate}%</div>
            </div>
          </div>

          {/* Parameter Table */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white print:text-black mb-4">Consolidado Analítico (CONAMA)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 print:text-black border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 print:border-black bg-slate-950 print:bg-gray-100">
                    <th className="py-3 px-4 font-semibold">Parâmetro</th>
                    <th className="py-3 px-4 font-semibold">Mín - Máx Legal</th>
                    <th className="py-3 px-4 font-semibold">Média Alcançada</th>
                    <th className="py-3 px-4 font-semibold">Pico Máximo</th>
                    <th className="py-3 px-4 font-semibold text-right">Quebras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-400">
                  {report.consolidatedParameters.map((p: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-medium">{p.name} <span className="text-xs text-slate-500">({p.unit})</span></td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {p.minLimit ?? 0} - {p.maxLimit ?? '∞'}
                      </td>
                      <td className={`py-3 px-4 font-bold ${p.maxLimit && p.avg > p.maxLimit ? 'text-red-500 print:text-red-700' : 'text-emerald-500 print:text-emerald-700'}`}>
                        {p.avg ?? '-'}
                      </td>
                      <td className="py-3 px-4 font-mono">{p.max ?? '-'}</td>
                      <td className="py-3 px-4 text-right">
                        {p.nonConformantCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 print:bg-transparent px-2 py-1 rounded-md text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" /> {p.nonConformantCount}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {report.consolidatedParameters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">Nenhuma leitura registrada no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Occurrences Log */}
          <div>
            <h2 className="text-xl font-bold text-white print:text-black mb-4">Diário de Ocorrências</h2>
            <div className="space-y-4 print:space-y-2">
              {report.occurrences.map((oc: any) => (
                <div key={oc.id} className="border border-slate-800 print:border-gray-400 bg-slate-950/50 print:bg-transparent rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded border mb-2 ${
                        oc.severity === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20 print:border-red-500' :
                        oc.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 print:border-orange-500' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20 print:border-blue-500'
                      }`}>
                        {oc.severity}
                      </span>
                      <h4 className="text-sm font-medium text-white print:text-black">{oc.description}</h4>
                    </div>
                    <span className="text-xs text-slate-500 print:text-gray-500 font-mono text-right">
                      Abertura: {new Date(oc.createdAt).toLocaleString('pt-BR')} <br/>
                      {oc.status === 'RESOLVED' ? (
                        <span className="text-emerald-500">Baixa: {new Date(oc.resolvedAt).toLocaleString('pt-BR')}</span>
                      ) : (
                        <span className="text-red-500">Prazo: {new Date(oc.deadline).toLocaleString('pt-BR')}</span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 print:text-gray-600 flex items-center gap-4">
                    <span>Relator: {oc.reporterName}</span>
                    {oc.resolverName && <span>Resolvido por: {oc.resolverName}</span>}
                  </div>
                </div>
              ))}
              {report.occurrences.length === 0 && (
                <div className="text-center text-slate-500 py-4 border border-dashed border-slate-800 print:border-gray-400 rounded-lg">
                  Nenhuma ocorrência registrada no período. Ótimo trabalho!
                </div>
              )}
            </div>
          </div>
          
          {/* Print Footer */}
          <div className="hidden print:block mt-12 pt-8 border-t border-black text-center text-xs text-gray-500">
            Fim do Relatório Oficial. Assinado Eletronicamente.
          </div>

        </div>
      )}
    </div>
  )
}
