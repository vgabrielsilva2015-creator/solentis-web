'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  AlertTriangle,
  User,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Calendar,
  Loader2,
  X
} from 'lucide-react'
import { updateOccurrenceStatus } from '@/app/operador/ocorrencias/actions'

const COLUMNS = [
  { id: 'OPEN', label: 'Aberta', color: 'border-t-amber-500 bg-amber-500/5 text-amber-400' },
  { id: 'IN_PROGRESS', label: 'Em Andamento', color: 'border-t-sky-500 bg-sky-500/5 text-sky-400' },
  { id: 'WAITING', label: 'Aguardando', color: 'border-t-purple-500 bg-purple-500/5 text-purple-400' },
  { id: 'RESOLVED', label: 'Resolvida', color: 'border-t-emerald-500 bg-emerald-500/5 text-emerald-400' },
]

const SEVERITY_CLASSES: Record<string, string> = {
  LOW: 'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH: 'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50 animate-pulse',
}

interface Occurrence {
  id: string
  description: string
  category: string | null
  type: string | null
  severity: string
  status: string
  deadline: Date
  created_at: Date
  reporter: { name: string }
  photos: { id: string }[]
}

interface OccurrencesKanbanProps {
  initialOccurrences: Occurrence[]
  baseUrl: string // e.g. "/gestor/ocorrencias" or "/operador/ocorrencias"
}

export function OccurrencesKanban({ initialOccurrences, baseUrl }: OccurrencesKanbanProps) {
  const [occurrences, setOccurrences] = useState<Occurrence[]>(initialOccurrences)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  // Resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggedId
    if (!id) return

    const item = occurrences.find(o => o.id === id)
    if (!item || item.status === targetStatus) return

    if (targetStatus === 'RESOLVED') {
      setResolvingId(id)
      setResolutionNotes('')
      setShowResolveModal(true)
    } else {
      performStatusUpdate(id, targetStatus)
    }
    setDraggedId(null)
  }

  const performStatusUpdate = (id: string, status: string, notes?: string) => {
    // Optimistic update
    setOccurrences(prev =>
      prev.map(o => (o.id === id ? { ...o, status } : o))
    )

    startTransition(async () => {
      try {
        await updateOccurrenceStatus(id, status, notes)
      } catch (err: any) {
        alert(err.message || 'Erro ao atualizar status.')
        // Rollback
        setOccurrences(initialOccurrences)
      }
    })
  }

  const handleConfirmResolve = () => {
    if (!resolvingId) return
    performStatusUpdate(resolvingId, 'RESOLVED', resolutionNotes)
    setShowResolveModal(false)
    setResolvingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(col => {
          const colItems = occurrences.filter(o => o.status === col.id)
          const isTargetColumn = draggedId && occurrences.find(o => o.id === draggedId)?.status !== col.id

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-xl border border-slate-850 bg-slate-900/30 flex flex-col min-h-[500px] transition-all pb-4 ${
                isTargetColumn ? 'ring-2 ring-emerald-500/20 bg-emerald-950/5 border-emerald-900/30' : ''
              }`}
            >
              {/* Column Header */}
              <div className={`p-3 border-t-2 rounded-t-xl font-bold text-xs flex justify-between items-center ${col.color} border-x border-slate-850 border-b border-b-slate-850/50 bg-slate-900/80`}>
                <span>{col.label}</span>
                <Badge variant="outline" className="text-[10px] bg-slate-950/40 text-slate-400 border-slate-800">
                  {colItems.length}
                </Badge>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px] scrollbar-thin">
                {colItems.length === 0 ? (
                  <div className="py-12 text-center text-[10px] text-slate-600 border border-dashed border-slate-850/60 rounded-lg">
                    Solte cartões aqui
                  </div>
                ) : (
                  colItems.map(item => {
                    const isOverdue = item.status !== 'RESOLVED' && new Date(item.deadline) < new Date()
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        className={`rounded-lg border border-slate-800 bg-slate-950/40 p-3.5 space-y-2.5 cursor-grab active:cursor-grabbing hover:border-slate-700 transition-all hover:-translate-y-0.5 shadow-sm group relative ${
                          isPending ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-1.5">
                          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${SEVERITY_CLASSES[item.severity] || ''}`}>
                            {item.severity === 'CRITICAL' ? 'Crítica' : item.severity === 'HIGH' ? 'Alta' : item.severity === 'MEDIUM' ? 'Média' : 'Baixa'}
                          </span>
                          <span className="text-[9px] text-slate-600 font-mono">
                            #{item.id.slice(-4).toUpperCase()}
                          </span>
                        </div>

                        {/* Title/Category */}
                        <div>
                          <Link href={`${baseUrl}/${item.id}`} className="text-xs font-bold text-slate-200 hover:text-sky-400 hover:underline line-clamp-1">
                            {item.category || 'Incidente'}
                          </Link>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* Footer details */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-900/60 text-[9px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[8px]">
                              {item.reporter.name.charAt(0)}
                            </span>
                            <span className="truncate max-w-[50px]">{item.reporter.name.split(' ')[0]}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.photos.length > 0 && (
                              <Paperclip className="w-3 h-3 text-slate-600" />
                            )}
                            <div className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-400 font-bold' : ''}`}>
                              <Clock className="w-3 h-3" />
                              <span>{new Date(item.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Resolution Notes Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200">Confirmar Resolução</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowResolveModal(false)} className="h-8 w-8 text-slate-400 hover:text-slate-100">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Notas de Resolução / O que foi feito? *</label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Descreva detalhadamente a ação corretiva tomada..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700 resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowResolveModal(false)} className="text-xs h-9 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200">
                Cancelar
              </Button>
              <Button
                disabled={!resolutionNotes.trim() || resolutionNotes.trim().length < 5}
                onClick={handleConfirmResolve}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold"
              >
                Resolver Ocorrência
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
