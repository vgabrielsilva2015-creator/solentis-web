'use client'

import { useState, useEffect } from 'react'
import { extractDataFromPDF, getMappingContext, saveMappedReadings } from './actions'
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, FileCheck2, FileWarning } from 'lucide-react'
import { useRouter } from 'next/navigation'
import stringSimilarity from 'string-similarity'

type FileStatus = 'pending' | 'extracting' | 'success' | 'error'

interface FileItem {
  id: string
  file: File
  status: FileStatus
  error?: string
  data?: any
  mappedPoint: string
  mappedDate: string
  mappedParams: Record<number, string>
}

export default function ImportLaudoPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  
  const [context, setContext] = useState<{parameters: any[], points: any[], aliases?: any[]}>({ parameters: [], points: [] })
  const [filesQueue, setFilesQueue] = useState<FileItem[]>([])

  useEffect(() => {
    getMappingContext().then(setContext)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setGlobalError(null)
    setIsProcessing(true)

    // Add to queue
    const newItems: FileItem[] = selectedFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      status: 'pending',
      mappedPoint: '',
      mappedDate: new Date().toISOString().split('T')[0],
      mappedParams: {}
    }))

    setFilesQueue(prev => [...prev, ...newItems])

    // Process them sequentially to avoid hammering the API if there are many
    let currentQueue = [...filesQueue, ...newItems]

    for (let i = 0; i < currentQueue.length; i++) {
      if (currentQueue[i].status !== 'pending') continue;

      // Update status to extracting
      updateFileItem(currentQueue[i].id, { status: 'extracting' })

      try {
        const file = currentQueue[i].file
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(file)
        })

        const result = await extractDataFromPDF(base64, file.type)
        if (result.success) {
          const data = result.data
          let mPoint = ''
          let mDate = data.dataColeta || new Date().toISOString().split('T')[0]
          
          if (data.pontoColeta) {
            const foundPoint = context.points.find(p => 
              p.name.toLowerCase().includes(data.pontoColeta.toLowerCase()) ||
              data.pontoColeta.toLowerCase().includes(p.name.toLowerCase())
            )
            if (foundPoint) mPoint = foundPoint.id
          }

          const mParams: Record<number, string> = {}
          data.parametros.forEach((p: any, idx: number) => {
            const nomeStr = p.nomeExtraido.trim()
            
            // 1. Tentar match exato via alias
            const foundAlias = context.aliases?.find((a: any) => a.alias.toLowerCase() === nomeStr.toLowerCase())
            if (foundAlias) {
              mParams[idx] = foundAlias.parameter_id
              return
            }

            // 2. Tentar match exato do nome oficial
            const exactParam = context.parameters.find(param => param.name.toLowerCase() === nomeStr.toLowerCase())
            if (exactParam) {
              mParams[idx] = exactParam.id
              return
            }

            // 3. Tentar Fuzzy Match
            if (context.parameters.length > 0) {
              const paramNames = context.parameters.map(param => param.name)
              const match = stringSimilarity.findBestMatch(nomeStr, paramNames)
              if (match.bestMatch.rating > 0.6) { // Confiança de 60%
                const matchedParam = context.parameters[match.bestMatchIndex]
                mParams[idx] = matchedParam.id
              }
            }
          })

          updateFileItem(currentQueue[i].id, {
            status: 'success',
            data,
            mappedPoint: mPoint,
            mappedDate: mDate,
            mappedParams: mParams
          })
        } else {
          updateFileItem(currentQueue[i].id, { status: 'error', error: result.error })
        }
      } catch (err: any) {
        updateFileItem(currentQueue[i].id, { status: 'error', error: err.message })
      }
    }

    setIsProcessing(false)
  }

  const updateFileItem = (id: string, updates: Partial<FileItem>) => {
    setFilesQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const handleSave = async () => {
    const successItems = filesQueue.filter(f => f.status === 'success')
    if (successItems.length === 0) return setGlobalError("Não há arquivos extraídos com sucesso para salvar.")
    
    // Validate mapping
    for (const item of successItems) {
      if (!item.mappedPoint) {
        return setGlobalError(`Selecione o ponto de coleta para o arquivo ${item.file.name}`)
      }
      const hasValidParam = item.data.parametros.some((p: any, idx: number) => item.mappedParams[idx] && !isNaN(parseFloat(p.valor)))
      if (!hasValidParam) {
        return setGlobalError(`Mapeie pelo menos um parâmetro válido para o arquivo ${item.file.name}`)
      }
    }

    setIsSaving(true)
    setGlobalError(null)

    // Save sequentially
    let allSuccess = true
    for (const item of successItems) {
      const validReadings = item.data.parametros
        .map((p: any, idx: number) => ({
          parameterId: item.mappedParams[idx],
          value: parseFloat(p.valor),
          originalName: p.nomeExtraido
        }))
        .filter((r: any) => r.parameterId && !isNaN(r.value))

      const result = await saveMappedReadings({
        pointId: item.mappedPoint,
        date: item.mappedDate,
        readings: validReadings
      })

      if (!result.success) {
        allSuccess = false
        setGlobalError(`Erro ao salvar ${item.file.name}: ${result.error}`)
        break
      }
    }

    setIsSaving(false)
    if (allSuccess) {
      setStep(3)
    }
  }

  const successfulFiles = filesQueue.filter(f => f.status === 'success')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Motor de Inteligência Ambiental (Batch)</h1>
        <p className="text-slate-400">Faça o upload de múltiplos laudos em PDF. A IA os lerá de forma sequencial utilizando fallbacks de resiliência.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 text-sm font-medium text-slate-500 border-b border-slate-800 pb-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-500' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}>1</div>
          Fila de Upload
        </div>
        <div className="flex-1 h-px bg-slate-800"></div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-500' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}>2</div>
          Revisão em Lote
        </div>
        <div className="flex-1 h-px bg-slate-800"></div>
        <div className={`flex items-center gap-2 ${step === 3 ? 'text-blue-500' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 3 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}>3</div>
          Finalizado
        </div>
      </div>

      {globalError && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {globalError}
        </div>
      )}

      {/* STEP 1: UPLOAD QUEUE */}
      {step === 1 && (
        <div className="space-y-6">
          <label className="border-2 border-dashed border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-800/50 hover:border-slate-600 transition-colors cursor-pointer group">
            <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 transition-colors">
              <UploadCloud className={`w-8 h-8 ${isProcessing ? 'text-blue-500 animate-pulse' : 'text-slate-400 group-hover:text-blue-400'}`} />
            </div>
            <h3 className="text-lg font-medium text-slate-200 mb-1">Arraste e solte múltiplos PDFs aqui</h3>
            <p className="text-slate-500 text-sm">Ou clique para procurar nos seus arquivos.</p>
          </label>

          {/* Queue View */}
          {filesQueue.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50">
                <h4 className="text-sm font-medium text-slate-300">Fila de Processamento</h4>
              </div>
              <ul className="divide-y divide-slate-800/50">
                {filesQueue.map(item => (
                  <li key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-300 truncate">{item.file.name}</span>
                    </div>
                    <div className="flex items-center shrink-0 ml-4">
                      {item.status === 'pending' && <span className="text-xs text-slate-500 font-mono">Aguardando...</span>}
                      {item.status === 'extracting' && (
                        <div className="flex items-center gap-2 text-blue-500 text-xs font-mono">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extraindo IA...
                        </div>
                      )}
                      {item.status === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono">
                          <CheckCircle className="w-3.5 h-3.5" /> Sucesso
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="flex items-center gap-2 text-red-500 text-xs font-mono max-w-[200px] truncate" title={item.error}>
                          <AlertCircle className="w-3.5 h-3.5" /> Falhou: {item.error}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              
              {!isProcessing && successfulFiles.length > 0 && (
                <div className="p-4 bg-slate-950/30 flex justify-end">
                  <button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                    Continuar para Mapeamento ({successfulFiles.length}) →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: MAPPING BATCH */}
      {step === 2 && (
        <div className="space-y-8">
          {successfulFiles.map((item, fileIndex) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/50">
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                <FileCheck2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium text-white truncate">{item.file.name}</h3>
                {item.data?.pontoColeta && (
                  <span className="ml-auto text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    Identificado: {item.data.pontoColeta}
                  </span>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Vincular a qual Ponto de Coleta?</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={item.mappedPoint}
                      onChange={e => updateFileItem(item.id, { mappedPoint: e.target.value })}
                    >
                      <option value="">-- Selecione o Ponto --</option>
                      {context.points.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Data da Coleta</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={item.mappedDate}
                      onChange={e => updateFileItem(item.id, { mappedDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Parâmetros Mapeados</h4>
                  {item.data?.parametros.map((p: any, pIdx: number) => (
                    <div key={pIdx} className="flex flex-col md:flex-row items-center gap-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="flex-1 w-full">
                        <div className="text-sm font-medium text-slate-300">
                          {p.nomeExtraido} <span className="text-slate-500 font-normal">({p.unidade})</span>
                        </div>
                        <div className="text-xl font-bold text-white mt-1">{p.valor}</div>
                      </div>
                      <div className="hidden md:flex items-center justify-center px-2">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </div>
                      <div className="flex-1 w-full">
                        <select 
                          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.mappedParams[pIdx] || ''}
                          onChange={e => updateFileItem(item.id, { 
                            mappedParams: { ...item.mappedParams, [pIdx]: e.target.value } 
                          })}
                        >
                          <option value="">-- Ignorar --</option>
                          {context.parameters.map(param => (
                            <option key={param.id} value={param.id}>{param.name} ({param.unit})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
              ← Voltar à Fila
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
              {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSaving ? 'Salvando Lote...' : `Salvar ${successfulFiles.length} Laudo(s) no Banco`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 3 && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-xl shadow-emerald-900/10">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Lote Importado com Sucesso!</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            Todos os {successfulFiles.length} laudos foram processados e atrelados aos parâmetros do CONAMA no Solentis. Ocorrências críticas já foram geradas se necessário.
          </p>
          <div className="flex gap-4">
            <button onClick={() => {
              setFilesQueue([])
              setStep(1)
            }} className="px-6 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
              Novo Lote
            </button>
            <button onClick={() => router.push('/gestor/leituras')} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-medium transition-colors">
              Ver Histórico de Leituras
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
