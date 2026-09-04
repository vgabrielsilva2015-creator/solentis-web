'use client'

import React from 'react'
import { F, cardFrame, miniEmpty, icon } from './ui-helpers'
import Link from 'next/link'

interface FeedBlockProps {
  dbProgress: {
    field: { done: number; scheduled: number }
    internal: { done: number; scheduled: number }
    external: { done: number; scheduled: number }
  }
  dbFeed: any[]
  dbMaintenance: any[]
}

export function FeedBlock({
  dbProgress,
  dbFeed,
  dbMaintenance
}: FeedBlockProps) {

  const renderAnalysesStatusWidget = () => {
    const pField = dbProgress.field
    const pInternal = dbProgress.internal
    const pExternal = dbProgress.external

    const fieldPct = pField.scheduled > 0 ? Math.round((pField.done / pField.scheduled) * 100) : 0
    const internalPct = pInternal.scheduled > 0 ? Math.round((pInternal.done / pInternal.scheduled) * 100) : 0
    const externalPct = pExternal.scheduled > 0 ? Math.round((pExternal.done / pExternal.scheduled) * 100) : 0

    return cardFrame(
      'Progresso Analítico',
      'Atividades Executadas Hoje',
      null,
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Coletas de Campo</span>
            <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>Agendado: {pField.scheduled}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 600, color: 'var(--brand)' }}>{pField.done}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: fieldPct === 100 ? 'var(--ok)' : 'var(--txt3)', width: '32px', textAlign: 'right' }}>{fieldPct}%</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Análises Internas (Técnico)</span>
            <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>Agendado: {pInternal.scheduled}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 600, color: 'var(--warn)' }}>{pInternal.done}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: internalPct === 100 ? 'var(--ok)' : 'var(--txt3)', width: '32px', textAlign: 'right' }}>{internalPct}%</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Laudos Externos</span>
            <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>Agendado: {pExternal.scheduled}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 600, color: 'var(--ok)' }}>{pExternal.done}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: externalPct === 100 ? 'var(--ok)' : 'var(--txt3)', width: '32px', textAlign: 'right' }}>{externalPct}%</span>
          </div>
        </div>
      </div>,
      'Execução'
    )
  }

  const renderFeedWidget = () => {
    if (dbFeed.length === 0) return cardFrame('Atividades recentes', 'Linha do tempo da ETE', null, miniEmpty('Sem atividades registradas hoje.'), 'Tempo real')
    const typeCol = { ok: 'var(--ok)', chem: 'var(--brand)', reading: 'var(--brand)', alert: 'var(--danger)', shift: 'var(--txt3)' }
    const items = dbFeed.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: '12px' }}>
        <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt3)', width: '40px', flex: 'none', textAlign: 'right', paddingTop: '1px' }}>
          {it.time}
        </span>
        <div style={{ position: 'relative', width: '14px', flex: 'none', display: 'flex', justifyContent: 'center' }}>
          {i < dbFeed.length - 1 && <span style={{ position: 'absolute', top: '14px', bottom: '-6px', width: '2px', background: 'var(--border)' }} />}
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: typeCol[it.type as keyof typeof typeCol] || 'var(--txt3)',
              boxShadow: '0 0 0 3px var(--s1)',
              marginTop: '3px',
              position: 'relative',
              zIndex: 1,
            }}
          />
        </div>
        <div style={{ paddingBottom: '15px', flex: 1, fontSize: '12.5px', color: 'var(--txt2)', lineHeight: 1.45 }}>
          <b style={{ fontWeight: 600, color: 'var(--txt)' }}>{it.who} </b>
          {it.text}
        </div>
      </div>
    ))
    return cardFrame('Atividades recentes', 'Linha do tempo da ETE', null, <div style={{ display: 'flex', flexDirection: 'column' }}>{items}</div>, 'Tempo real')
  }

  const renderMaintenanceWidget = () => {
    if (dbMaintenance.length === 0) {
      return cardFrame(
        'Manutenção Preventiva', 
        'Próximos 30 dias', 
        null, 
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--ok-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            {icon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 20, 'var(--ok)')}
          </div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--txt)' }}>Tudo em ordem</div>
          <div style={{ fontSize: '11.5px', color: 'var(--txt3)', marginTop: '2px' }}>Sem manutenções preventivas nos próximos 30 dias.</div>
        </div>, 
        'Ativos'
      )
    }
    
    const rows = dbMaintenance.map((m, i) => {
      let col = 'var(--ok)'
      let bg = 'var(--ok-soft)'
      let daysText = `${m.days}d`
      let alertStyle: React.CSSProperties = {}

      if (m.days <= 7) {
        col = 'var(--danger)'
        bg = 'var(--danger-soft)'
        daysText = m.days < 0 ? 'Atrasada' : m.days === 0 ? 'Hoje' : `${m.days} dias`
        if (m.days <= 0) {
          alertStyle = { animation: 'pulse 2s infinite' }
        }
      } else if (m.days <= 15) {
        col = 'var(--warn)'
        bg = 'var(--warn-soft)'
        daysText = `${m.days} dias`
      } else {
        col = 'var(--ok)'
        bg = 'var(--ok-soft)'
        daysText = `${m.days} dias`
      }

      const formattedSchedDate = new Date(m.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

      return (
        <div 
          key={i} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px 0', 
            borderTop: i ? '1px solid var(--border)' : 'none' 
          }}
        >
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--txt3)',
              flexShrink: 0
            }}
          >
            {icon('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', 16, 'var(--txt2)')}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/gestor/equipamentos/${m.equipmentId}`}
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              className="hover:underline"
            >
              {m.name}
            </Link>
            <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>
              Agendado: {formattedSchedDate}
            </div>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: F.mono,
              color: col,
              background: bg,
              padding: '4px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              ...alertStyle
            }}
          >
            {daysText}
          </span>
        </div>
      )
    })

    return cardFrame('Manutenção Preventiva', 'Próximos 30 dias', null, <div style={{ display: 'flex', flexDirection: 'column' }}>{rows}</div>, 'Ativos')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', paddingBottom: '40px' }}>
      {renderAnalysesStatusWidget()}
      {renderFeedWidget()}
      {renderMaintenanceWidget()}
    </div>
  )
}
