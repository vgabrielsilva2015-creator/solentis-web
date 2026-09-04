'use client'

import React from 'react'
import { F, alpha, cardFrame, icon } from './ui-helpers'
import { useRouter } from 'next/navigation'

interface HeatmapBlockProps {
  dbHeatmapPoints: any[]
  dbCriticalOccurrences: any[]
  onOpenPointDrawer: (id: string) => void
}

export function HeatmapBlock({
  dbHeatmapPoints,
  dbCriticalOccurrences,
  onOpenPointDrawer
}: HeatmapBlockProps) {

  const getPointIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('entrada') || lower.includes('afluente') || lower.includes('bruto')) {
      return icon('M19 12H5m7-7-7 7 7 7', 20, 'currentColor')
    }
    if (lower.includes('reator') || lower.includes('tanque') || lower.includes('biológico') || lower.includes('aeróbio')) {
      return icon(['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 6v6l4 2'], 20, 'currentColor')
    }
    if (lower.includes('decantador') || lower.includes('filtro') || lower.includes('sedimentador')) {
      return icon('M22 3H2l8 9.46V19l4 2v-8.54L22 3z', 20, 'currentColor')
    }
    if (lower.includes('saída') || lower.includes('descarte') || lower.includes('efluente tratado') || lower.includes('deságue')) {
      return icon('M5 12h14m-7-7 7 7-7 7', 20, 'currentColor')
    }
    return icon(['M2 10h20', 'M2 14h20'], 20, 'currentColor')
  }

  const renderPoints = () => {
    const cards = dbHeatmapPoints.map((p) => {
      let statusLabel = 'Conforme'
      let statusColor = 'var(--ok)'
      let subInfo = 'Últimas 24h conformes'
      let glow = 'none'

      if (p.status === 'DANGER') {
        statusLabel = 'Fora dos Limites'
        statusColor = 'var(--danger)'
        subInfo = 'Medição irregular nas últimas 24h'
        glow = `0 0 8px ${alpha('var(--danger)', 0.4)}`
      } else if (p.status === 'WARNING') {
        statusLabel = 'Sem Medição'
        statusColor = 'var(--warn)'
        subInfo = 'Nenhuma leitura nas últimas 24h'
        glow = `0 0 8px ${alpha('var(--warn)', 0.3)}`
      }

      return (
        <div
          key={p.id}
          onClick={() => onOpenPointDrawer(p.id)}
          style={{
            background: 'var(--s2)',
            border: `1px solid ${p.status === 'DANGER' ? alpha('var(--danger)', 0.4) : 'var(--border)'}`,
            borderRadius: '12px',
            padding: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: p.status === 'DANGER' ? glow : 'none',
            transition: 'all 0.2s ease',
          }}
          className="hover:scale-[1.02] hover:bg-[var(--s3)]"
        >
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: statusColor,
              flexShrink: 0
            }}
          >
            {getPointIcon(p.name)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span 
                style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: statusColor, 
                  boxShadow: p.status === 'DANGER' ? '0 0 6px var(--danger)' : 'none',
                  flexShrink: 0 
                }} 
                className={p.status === 'DANGER' ? 'animate-pulse' : ''}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>
                {subInfo}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: F.mono, color: statusColor, textTransform: 'uppercase' }}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      )
    })

    const hint = 'Clique em um ponto para abrir o histórico detalhado →'
    const body = (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">{cards}</div>
        <div style={{ marginTop: '14px', fontSize: '11.5px', color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon('M13 2 3 14h9l-1 8 10-12h-9l1-8z', 13, 'var(--brand)')}
          {hint}
        </div>
      </div>
    )
    return cardFrame('Pontos de Coleta', 'Monitoramento operacional em tempo real', null, body, 'Planta')
  }

  const renderOccurrencesWidget = () => {
    const list = dbCriticalOccurrences.map((o, i) => {
      let col = 'var(--txt3)'
      if (o.severity === 'CRITICAL') col = 'var(--danger)'
      else if (o.severity === 'HIGH') col = 'var(--warn)'
      else if (o.severity === 'MEDIUM') col = 'var(--brand)'
      else if (o.severity === 'LOW') col = '#64748b'

      const dateStr = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const timeStr = new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

      return (
        <div 
          key={i} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px', 
            background: 'var(--s2)',
            border: `1px solid ${o.severity === 'CRITICAL' ? alpha('var(--danger)', 0.2) : 'var(--border)'}`,
            borderRadius: '10px',
            marginBottom: '8px'
          }}
        >
          <span 
            style={{ 
              width: '4px', 
              height: '36px',
              borderRadius: '2px', 
              background: col, 
              flex: 'none' 
            }} 
            className={o.severity === 'CRITICAL' ? 'animate-pulse' : ''}
          />
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {o.description || 'Sem descrição'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>
              {o.collection_point?.name ? `Ponto: ${o.collection_point.name} · ` : ''}Abertura: {dateStr} às {timeStr}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                fontFamily: F.mono,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: col,
                background: alpha(col, 0.12),
                padding: '2px 8px',
                borderRadius: '6px',
                flex: 'none',
              }}
            >
              {o.severity === 'CRITICAL' ? 'Crítica' : o.severity === 'HIGH' ? 'Alta' : o.severity === 'MEDIUM' ? 'Média' : 'Baixa'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--txt3)' }}>
              Status: {o.status === 'OPEN' ? 'Aberta' : 'Em progresso'}
            </span>
          </div>
        </div>
      )
    })

    const body = (
      <div>
        {dbCriticalOccurrences.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--ok-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              {icon('M5 13l4 4L19 7', 20, 'var(--ok)')}
            </div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--txt)' }}>Nenhum alerta ativo</div>
            <div style={{ fontSize: '11.5px', color: 'var(--txt3)', marginTop: '2px' }}>ETE operando em plena conformidade.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '310px', overflowY: 'auto' }}>
            {list}
          </div>
        )}
      </div>
    )
    return cardFrame('Alertas Ativos', 'Ocorrências operacionais em aberto', null, body, 'Operação')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
      {renderPoints()}
      {renderOccurrencesWidget()}
    </div>
  )
}
