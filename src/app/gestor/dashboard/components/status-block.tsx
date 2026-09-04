'use client'

import React from 'react'
import { F, activeVars, alpha, icon } from './ui-helpers'
import Link from 'next/link'

interface StatusBlockProps {
  eteStatus: 'OK' | 'WARNING' | 'DANGER'
  activeOperatorName: string | null
  activeShiftName: string | null
  absoluteLatestReading: any
  latestNCToday: any
  onOpenReadingModal: () => void
  onShowToast: (text: string, type: 'success' | 'info' | 'error') => void
}

export function StatusBlock({
  eteStatus,
  activeOperatorName,
  activeShiftName,
  absoluteLatestReading,
  latestNCToday,
  onOpenReadingModal,
  onShowToast
}: StatusBlockProps) {
  const statusMap = {
    OK: {
      col: 'var(--ok)',
      bg: 'var(--ok-soft)',
      title: 'Operação Normal',
      desc: 'Todos os parâmetros monitorados estão dentro da conformidade legal.',
      iconD: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    WARNING: {
      col: 'var(--warn)',
      bg: 'var(--warn-soft)',
      title: 'Operação em Atenção',
      desc: 'Desvio detectado ou ocorrência operacional sob análise.',
      iconD: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    },
    DANGER: {
      col: 'var(--danger)',
      bg: 'var(--danger-soft)',
      title: 'Operação Crítica',
      desc: 'Ocorrência de gravidade crítica em aberto. Requer intervenção imediata.',
      iconD: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    }
  }

  const currentStatus = statusMap[eteStatus]

  const lastReadingTime = absoluteLatestReading 
    ? new Date(absoluteLatestReading.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const renderEteStatusWidget = () => (
    <div 
      style={{
        background: 'var(--s1)',
        border: `1px solid var(--border)`,
        borderRadius: '16px',
        padding: '20px',
        boxShadow: 'var(--shadow)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '190px'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: currentStatus.col,
          filter: 'blur(70px)',
          opacity: 0.15,
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div 
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: currentStatus.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {icon(currentStatus.iconD, 24, currentStatus.col)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontFamily: F.mono, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)' }}>
            Status Geral da ETE
          </div>
          <h3 style={{ fontFamily: F.sora, fontSize: '18px', fontWeight: 700, margin: '4px 0 2px', color: 'var(--txt)' }}>
            {currentStatus.title}
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--txt2)', margin: 0, lineHeight: 1.4 }}>
            {currentStatus.desc}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: '10px', fontFamily: F.mono, color: 'var(--txt3)', textTransform: 'uppercase' }}>
            Operador de Plantão
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon('M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 11-8 0 4 4 0 018 0z', 13, 'var(--brand)')}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              {activeOperatorName ? `${activeOperatorName} (${activeShiftName || 'Turno'})` : 'Nenhum plantonista'}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontFamily: F.mono, color: 'var(--txt3)', textTransform: 'uppercase' }}>
            Último Registro
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: absoluteLatestReading?.isNonConformant ? 'var(--danger)' : 'var(--txt)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', 13, absoluteLatestReading?.isNonConformant ? 'var(--danger)' : 'var(--txt3)')}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              {absoluteLatestReading ? `${absoluteLatestReading.parameterName} (${lastReadingTime})` : 'Sem registros'}
            </span>
          </div>
        </div>
      </div>

      {latestNCToday && (
        <div 
          style={{
            marginTop: '12px',
            background: alpha('var(--danger)', 0.08),
            border: `1px solid ${alpha('var(--danger)', 0.2)}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 13, 'var(--danger)')}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Fora dos Limites: {latestNCToday.parameterName} às {new Date(latestNCToday.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} no ponto {latestNCToday.pointName} ({latestNCToday.value} {latestNCToday.unit})
          </span>
        </div>
      )}
    </div>
  )

  const renderQuickActions = () => (
    <div 
      style={{
        background: 'var(--s1)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '190px'
      }}
    >
      <div>
        <div style={{ fontSize: '11px', fontFamily: F.mono, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)' }}>
          Ações Rápidas
        </div>
        <h3 style={{ fontFamily: F.sora, fontSize: '16px', fontWeight: 600, margin: '4px 0 12px', color: 'var(--txt)' }}>
          Atalhos Operacionais
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={onOpenReadingModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--brand)',
            color: 'var(--on-brand)',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: F.body,
            transition: 'transform 0.15s, opacity 0.15s',
          }}
          className="hover:scale-[1.01] hover:opacity-95 active:scale-[0.99]"
        >
          {icon('M12 4v16m8-8H4', 16, 'var(--on-brand)')}
          Lançar Nova Leitura
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <Link
            href="/gestor/ocorrencias/novo"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--s2)',
              color: 'var(--txt)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '11px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              fontFamily: F.body,
              transition: 'background-color 0.2s, transform 0.15s',
            }}
            className="hover:bg-[var(--s3)] hover:scale-[1.01]"
          >
            {icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 15, 'var(--txt)')}
            Ocorrência
          </Link>

          <button
            onClick={() => onShowToast('Relatório operacional do dia compilado com sucesso!', 'success')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--s2)',
              color: 'var(--txt)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '11px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: F.body,
              transition: 'background-color 0.2s, transform 0.15s',
            }}
            className="hover:bg-[var(--s3)] hover:scale-[1.01]"
          >
            {icon('M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 15, 'var(--txt)')}
            Relatório PDF
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-[18px]">
      {renderEteStatusWidget()}
      {renderQuickActions()}
    </div>
  )
}
