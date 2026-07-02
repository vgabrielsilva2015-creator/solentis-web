'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, MessageSquare, Calendar, Loader2, Clock, CheckCircle2, AlertTriangle, Send } from 'lucide-react'
import { addOccurrenceComment } from '@/app/operador/ocorrencias/actions'

interface Comment {
  id: string
  text: string
  created_at: Date
  user: {
    name: string
    role: string
  }
}

interface OccurrenceTimelineProps {
  occurrenceId: string
  reporterName: string
  createdAt: Date
  status: string
  resolvedAt: Date | null
  resolverName?: string | null
  resolutionNotes?: string | null
  comments: Comment[]
}

export function OccurrenceTimeline({
  occurrenceId,
  reporterName,
  createdAt,
  status,
  resolvedAt,
  resolverName,
  resolutionNotes,
  comments
}: OccurrenceTimelineProps) {
  const [commentText, setCommentText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || commentText.trim().length < 2) return

    setError(null)
    startTransition(async () => {
      try {
        await addOccurrenceComment(occurrenceId, commentText)
        setCommentText('')
      } catch (err: any) {
        setError(err.message || 'Erro ao adicionar comentário.')
      }
    })
  }

  // Combine comments and status changes into a single sorted timeline list
  const timelineEvents: {
    id: string
    type: 'creation' | 'comment' | 'resolution'
    date: Date
    title: string
    content?: string
    actor: string
    actorRole?: string
  }[] = [
    {
      id: 'creation',
      type: 'creation',
      date: new Date(createdAt),
      title: 'Ocorrência Reportada',
      actor: reporterName,
    }
  ]

  comments.forEach(c => {
    timelineEvents.push({
      id: c.id,
      type: 'comment',
      date: new Date(c.created_at),
      title: 'Comentário adicionado',
      content: c.text,
      actor: c.user.name,
      actorRole: c.user.role === 'MANAGER' ? 'Gestor' : c.user.role === 'TECHNICIAN' ? 'Técnico' : 'Operador',
    })
  })

  if (status === 'RESOLVED' && resolvedAt) {
    timelineEvents.push({
      id: 'resolution',
      type: 'resolution',
      date: new Date(resolvedAt),
      title: 'Ocorrência Resolvida',
      content: resolutionNotes || undefined,
      actor: resolverName || 'Desconhecido',
    })
  }

  // Sort chronologically (oldest first)
  timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" /> Timeline e Comentários
      </h3>

      {/* Timeline view */}
      <div className="relative border-l border-border ml-4 pl-6 space-y-6">
        {timelineEvents.map((evt) => {
          let icon = <Clock className="w-4 h-4 text-muted-foreground" />
          let iconBg = 'bg-card border-border'
          let contentBg = 'bg-background/20'

          if (evt.type === 'creation') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-500" />
            iconBg = 'bg-amber-950/40 border-amber-900/40'
          } else if (evt.type === 'resolution') {
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            iconBg = 'bg-emerald-950/40 border-emerald-900/40'
            contentBg = 'bg-emerald-950/10 border-emerald-900/20'
          } else if (evt.type === 'comment') {
            icon = <MessageSquare className="w-4 h-4 text-sky-400" />
            iconBg = 'bg-sky-950/40 border-sky-900/40'
          }

          return (
            <div key={evt.id} className="relative group">
              {/* Floating icon */}
              <span className={`absolute -left-[35px] top-1.5 flex items-center justify-center w-7 h-7 rounded-full border shadow-md ${iconBg}`}>
                {icon}
              </span>

              {/* Event card */}
              <div className={`rounded-xl border border-border p-4 space-y-2 ${contentBg}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{evt.title}</span>
                    {evt.actorRole && (
                      <Badge className="bg-muted text-muted-foreground text-[9px] hover:bg-muted">
                        {evt.actorRole}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {evt.date.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="space-y-1">
                  {evt.content && (
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-card/40 rounded p-2.5 border border-border/50">
                      {evt.content}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    <User className="w-3 h-3" /> Por: <span className="font-semibold text-muted-foreground">{evt.actor}</span>
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleAddComment} className="border-t border-border pt-4 mt-6">
        {error && (
          <p className="text-xs text-red-400 mb-3 bg-red-950/20 p-2.5 rounded border border-red-900/30">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={isPending}
            placeholder="Adicione um comentário ou atualização na timeline..."
            className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
          />
          <Button
            type="submit"
            disabled={isPending || !commentText.trim() || commentText.trim().length < 2}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 h-9 flex items-center gap-1"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Enviar
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
