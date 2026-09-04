'use client'

import React from 'react'
import { F, buildSpark } from './ui-helpers'
import Link from 'next/link'

interface KpiBlockProps {
  dbTotalRegistersToday: number
  dbRegistersDelta: number | null
  dbProgress: {
    field: { done: number; scheduled: number }
    internal: { done: number; scheduled: number }
    external: { done: number; scheduled: number }
  }
  dbOpenOccurrences: number
  dbConfCurrent: number | null
  dbConfDelta: number | null
  dbSparklineData: number[]
  diasNum: number
}

export function KpiBlock({
  dbTotalRegistersToday,
  dbRegistersDelta,
  dbProgress,
  dbOpenOccurrences,
  dbConfCurrent,
  dbConfDelta,
  dbSparklineData,
  diasNum
}: KpiBlockProps) {
  const confValue = dbConfCurrent !== null ? `${dbConfCurrent.toFixed(1)}%` : '—'
  const confDeltaVal = dbConfDelta !== null ? dbConfDelta : null

  const kpis = [
    {
      title: 'Registros Hoje',
      val: dbTotalRegistersToday,
      delta: dbRegistersDelta,
      label: 'vs ontem',
      href: '/gestor/leituras',
      spark: dbSparklineData.length > 0 ? dbSparklineData : null,
      alert: false,
    },
    {
      title: 'Ocorrências Abertas',
      val: dbOpenOccurrences,
      delta: null,
      label: '',
      href: '/gestor/ocorrencias',
      spark: null,
      alert: dbOpenOccurrences > 0,
    },
    {
      title: 'Coletas Pendentes Hoje',
      val: Math.max(0, (dbProgress.field.scheduled + dbProgress.internal.scheduled + dbProgress.external.scheduled) - (dbProgress.field.done + dbProgress.internal.done + dbProgress.external.done)),
      delta: null,
      label: `de ${dbProgress.field.scheduled + dbProgress.internal.scheduled + dbProgress.external.scheduled} agendadas`,
      href: null,
      spark: null,
      alert: Math.max(0, (dbProgress.field.scheduled + dbProgress.internal.scheduled + dbProgress.external.scheduled) - (dbProgress.field.done + dbProgress.internal.done + dbProgress.external.done)) > 0,
    },
    {
      title: 'Conformidade CONAMA',
      val: confValue,
      delta: confDeltaVal,
      label: `vs ${diasNum}d anteriores`,
      href: null,
      spark: null,
      alert: false,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {kpis.map((k, i) => {
        const ruleColor = k.alert ? 'var(--danger)' : 'var(--brand)'
        return (
          <div
            key={i}
            style={{
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '16px',
              position: 'relative',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: ruleColor, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontSize: '11px', color: 'var(--txt3)', fontWeight: 500, fontFamily: F.mono, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {k.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '10px' }}>
              <span style={{ fontFamily: F.sora, fontSize: '30px', fontWeight: 700, color: 'var(--txt)' }}>{k.val}</span>
              {k.delta !== null && (
                <span style={{ fontSize: '11.5px', color: k.delta >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 600, fontFamily: F.mono }}>
                  {k.delta >= 0 ? '+' : ''}
                  {k.delta}%
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', minHeight: '34px' }}>
              {k.label && <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>{k.label}</span>}
              {k.spark && <div style={{ width: '100px', flexShrink: 0, marginLeft: 'auto' }}>{buildSpark(k.spark, 'var(--brand)')}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
