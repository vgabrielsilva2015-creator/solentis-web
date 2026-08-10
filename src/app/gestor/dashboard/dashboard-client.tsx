'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { registrarLeitura } from '@/app/operador/leituras/actions'
import { obterDetalhesPonto } from './actions'
import { APP_TIMEZONE } from '@/lib/date-utils'

import { F, activeVars, alpha, icon, buildSpark } from './components/ui-helpers'
import { KpiBlock } from './components/kpi-block'
import { TrendBlock } from './components/trend-block'
import { HeatmapBlock } from './components/heatmap-block'
import { FeedBlock } from './components/feed-block'
import { StatusBlock } from './components/status-block'

interface DashboardClientProps {
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
  dbHeatmapPoints: { id: string; name: string; status: 'OK' | 'WARNING' | 'DANGER' }[]
  dbCriticalOccurrences: any[]
  dbOccurrencesPieData: { name: string; value: number; color: string }[]
  dbChemicalConsumptionData: { name: string; unit: string; total: number }[]
  dbTrendData: any[]
  dbFeed: any[]
  dbMaintenance: any[]
  dbParameters: { id: string; name: string; unit: string; min_limit?: number | null; max_limit?: number | null }[]
  dbSelectedParam: any
  diasNum: number
  paramId?: string
  pontoId?: string
  activePointName?: string | null
  eteStatus: 'OK' | 'WARNING' | 'DANGER'
  activeOperatorName: string | null
  activeShiftName: string | null
  absoluteLatestReading: {
    type: 'FIELD' | 'INTERNAL' | 'EXTERNAL'
    date: string | Date
    parameterName: string
    pointName: string
    value: number | null
    unit: string
    isNonConformant: boolean
  } | null
  latestNCToday: {
    date: string | Date
    parameterName: string
    pointName: string
    value: number | null
    unit: string
  } | null
}

export function DashboardClient({
  dbTotalRegistersToday,
  dbRegistersDelta,
  dbProgress,
  dbOpenOccurrences,
  dbConfCurrent,
  dbConfDelta,
  dbSparklineData,
  dbHeatmapPoints,
  dbCriticalOccurrences,
  dbOccurrencesPieData,
  dbChemicalConsumptionData,
  dbTrendData,
  dbFeed,
  dbMaintenance,
  dbParameters,
  dbSelectedParam,
  diasNum,
  paramId,
  pontoId,
  activePointName,
  eteStatus,
  activeOperatorName,
  activeShiftName,
  absoluteLatestReading,
  latestNCToday,
}: DashboardClientProps) {
  const router = useRouter()
  const [isNavPending, startNav] = useTransition()

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerData, setDrawerData] = useState<any>(null)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // Modal state
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false)
  const [modalCollectionPointId, setModalCollectionPointId] = useState('')
  const [modalParameterId, setModalParameterId] = useState('')
  const [modalValue, setModalValue] = useState('')
  const [modalUnit, setModalUnit] = useState('')
  const [modalNotes, setModalNotes] = useState('')
  const [modalRecordedAt, setModalRecordedAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState(false)

  const handlePointClick = async (pointId: string) => {
    setIsDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError(null)
    setDrawerData(null)
    try {
      const data = await obterDetalhesPonto(pointId)
      setDrawerData(data)
    } catch (err: any) {
      setDrawerError(err.message || 'Erro ao carregar detalhes do ponto')
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleParameterChange = (pId: string) => {
    setModalParameterId(pId)
    const param = dbParameters.find(p => p.id === pId)
    if (param) {
      setModalUnit(param.unit || '')
    } else {
      setModalUnit('')
    }
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setModalError(null)

    if (!modalCollectionPointId) {
      setModalError('Selecione um ponto de coleta')
      setIsSubmitting(false)
      return
    }
    if (!modalRecordedAt) {
      setModalError('Data/hora da coleta é obrigatória')
      setIsSubmitting(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('collection_point_id', modalCollectionPointId)
      formData.append('parameter_id', modalParameterId)
      formData.append('value', modalValue)
      formData.append('unit', modalUnit)
      formData.append('notes', modalNotes)
      formData.append('recorded_at', modalRecordedAt)

      const result = await registrarLeitura({}, formData)

      if (result.error) {
        setModalError(result.error)
      } else if (result.fieldErrors) {
        const firstErr = Object.values(result.fieldErrors)[0]?.[0]
        setModalError(firstErr || 'Erro de validação')
      } else if (result.success) {
        setModalSuccess(true)
        // Reset form
        setModalCollectionPointId('')
        setModalParameterId('')
        setModalValue('')
        setModalUnit('')
        setModalNotes('')
        setTimeout(() => {
          setIsReadingModalOpen(false)
          setModalSuccess(false)
          router.refresh()
        }, 1500)
      }
    } catch (err: any) {
      setModalError(err.message || 'Erro ao registrar leitura')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onOpenReadingModal = () => {
    setModalCollectionPointId('')
    setModalParameterId('')
    setModalValue('')
    setModalUnit('')
    setModalNotes('')
    setIsReadingModalOpen(true)
  }

  const renderPointDrawer = () => {
    if (!isDrawerOpen) return null

    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s',
        }}
        onClick={() => setIsDrawerOpen(false)}
      >
        <div 
          style={{
            width: '100%',
            maxWidth: '460px',
            height: '100%',
            background: 'var(--s1)',
            borderLeft: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '10px', fontFamily: F.mono, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--brand)' }}>
                Detalhes do Ponto
              </span>
              <h2 style={{ fontFamily: F.sora, fontSize: '20px', fontWeight: 700, color: 'var(--txt)', margin: '4px 0 0' }}>
                {drawerLoading ? 'Carregando...' : drawerData?.ponto.name}
              </h2>
              {!drawerLoading && drawerData?.ponto.location && (
                <p style={{ fontSize: '12px', color: 'var(--txt3)', margin: '4px 0 0' }}>
                  Local: {drawerData.ponto.location}
                </p>
              )}
            </div>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--txt3)', cursor: 'pointer', padding: '4px' }}
            >
              {icon('M6 18L18 6M6 6l12 12', 20, 'var(--txt3)')}
            </button>
          </div>

          {drawerLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3 text-muted-foreground">
              <span className="w-6 h-6 border-2 border-t-brand border-border rounded-full animate-spin" />
              <span>Buscando histórico...</span>
            </div>
          ) : drawerError ? (
            <div className="text-center py-12 text-red-400 text-sm">
              {drawerError}
            </div>
          ) : drawerData ? (
            <>
              {/* Status Badge */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: drawerData.statusConformidade === 'DANGER' ? alpha('var(--danger)', 0.1) : alpha('var(--ok)', 0.1),
                  border: `1px solid ${drawerData.statusConformidade === 'DANGER' ? alpha('var(--danger)', 0.3) : alpha('var(--ok)', 0.3)}`,
                  padding: '12px 16px',
                  borderRadius: '10px',
                }}
              >
                <span 
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: drawerData.statusConformidade === 'DANGER' ? 'var(--danger)' : 'var(--ok)',
                    boxShadow: drawerData.statusConformidade === 'DANGER' ? '0 0 8px var(--danger)' : 'none',
                  }}
                  className={drawerData.statusConformidade === 'DANGER' ? 'animate-pulse' : ''}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)' }}>
                    {drawerData.statusConformidade === 'DANGER' ? 'Ocorrências ou Desvios Detectados' : 'Ponto em Conformidade'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>
                    {drawerData.statusConformidade === 'DANGER' ? 'Medições fora dos limites nas últimas 24h' : 'Todas as últimas medições dentro da faixa legal'}
                  </span>
                </div>
              </div>

              {/* Sparkline / Trend */}
              {drawerData.sparklineData.length > 0 && (
                <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontFamily: F.mono, textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: '8px' }}>
                    Tendência Recente de {drawerData.parameterName}
                  </div>
                  <div style={{ height: '80px', marginTop: '10px' }}>
                    {buildSpark(drawerData.sparklineData.map((d: any) => d.value), 'var(--brand)')}
                  </div>
                  {drawerData.limits.max !== null || drawerData.limits.min !== null ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--txt3)', marginTop: '8px', fontFamily: F.mono }}>
                      {drawerData.limits.min !== null && <span>Mín: {drawerData.limits.min}</span>}
                      {drawerData.limits.max !== null && <span>Máx: {drawerData.limits.max}</span>}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Last 5 readings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '11px', fontFamily: F.mono, textTransform: 'uppercase', color: 'var(--txt3)' }}>
                  Últimos 5 Lançamentos (Campo & Lab)
                </span>
                
                {drawerData.leituras.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '12.5px', color: 'var(--txt3)' }}>
                    Nenhum registro encontrado para este ponto.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {drawerData.leituras.map((l: any) => {
                      const limitColor = l.is_non_conformant ? 'var(--danger)' : 'var(--txt2)'
                      const limitBg = l.is_non_conformant ? alpha('var(--danger)', 0.1) : 'transparent'
                      const limitBorder = l.is_non_conformant ? `1px solid ${alpha('var(--danger)', 0.3)}` : 'none'

                      return (
                        <div 
                          key={l.id}
                          style={{
                            background: l.is_non_conformant ? limitBg : 'var(--s2)',
                            border: l.is_non_conformant ? limitBorder : '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', fontFamily: F.mono, color: 'var(--txt3)' }}>
                              {l.tipo} · {new Date(l.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE })}
                            </span>
                            {l.is_non_conformant && (
                              <span 
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  fontFamily: F.mono,
                                  color: 'var(--danger)',
                                  background: alpha('var(--danger)', 0.15),
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                Fora Limite
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)' }}>
                              {l.parameter?.name || 'Parâmetro'}
                            </span>
                            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 700, color: limitColor }}>
                              {l.value !== null ? `${l.value} ${l.unit || ''}` : '—'}
                            </span>
                          </div>

                          {l.notes && (
                            <p style={{ fontSize: '11.5px', color: 'var(--txt3)', margin: '4px 0 0', fontStyle: 'italic' }}>
                              " {l.notes} "
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Drawer footer CTA */}
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    setModalCollectionPointId(drawerData.ponto.id)
                    setModalParameterId('')
                    setModalValue('')
                    setModalUnit('')
                    setModalNotes('')
                    setIsDrawerOpen(false)
                    setIsReadingModalOpen(true)
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--brand)',
                    color: 'var(--on-brand)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: F.body,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {icon('M12 4v16m8-8H4', 16, 'var(--on-brand)')}
                  Nova Leitura de Campo
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  const renderReadingModal = () => {
    if (!isReadingModalOpen) return null

    const selectedParamObj = dbParameters.find(p => p.id === modalParameterId)
    const isModalValueNonConformant = selectedParamObj && modalValue !== '' && (
      (selectedParamObj.min_limit !== undefined && selectedParamObj.min_limit !== null && Number(modalValue) < selectedParamObj.min_limit) ||
      (selectedParamObj.max_limit !== undefined && selectedParamObj.max_limit !== null && Number(modalValue) > selectedParamObj.max_limit)
    )

    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(5px)',
          padding: '16px',
        }}
        onClick={() => setIsReadingModalOpen(false)}
      >
        <div 
          style={{
            width: '100%',
            maxWidth: '480px',
            background: 'var(--s1)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: F.sora, fontSize: '18px', fontWeight: 700, color: 'var(--txt)', margin: 0 }}>
                Registrar Leitura de Campo
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--txt3)', margin: '4px 0 0' }}>
                Lançamento rápido direto no banco operacional.
              </p>
            </div>
            <button 
              onClick={() => setIsReadingModalOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--txt3)', cursor: 'pointer', padding: '4px' }}
            >
              {icon('M6 18L18 6M6 6l12 12', 20, 'var(--txt3)')}
            </button>
          </div>

          {modalSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-emerald-400">
              <span className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                {icon('M5 13l4 4L19 7', 24, 'var(--ok)')}
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Leitura registrada com sucesso!</span>
            </div>
          ) : (
            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {modalError && (
                <div style={{ background: alpha('var(--danger)', 0.1), border: `1px solid ${alpha('var(--danger)', 0.3)}`, color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                  {modalError}
                </div>
              )}

              {/* Collection Point */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Ponto de Coleta
                </label>
                <select
                  required
                  value={modalCollectionPointId}
                  onChange={(e) => setModalCollectionPointId(e.target.value)}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                  }}
                >
                  <option value="">Selecione o Ponto de Coleta</option>
                  {dbHeatmapPoints.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Parameter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Parâmetro
                </label>
                <select
                  value={modalParameterId}
                  onChange={(e) => handleParameterChange(e.target.value)}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                  }}
                >
                  <option value="">Sem parâmetro (apenas observação)</option>
                  {dbParameters.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {modalParameterId && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
                  {/* Value */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                      Valor Medido
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      inputMode="decimal"
                      value={modalValue}
                      onChange={(e) => setModalValue(e.target.value)}
                      style={{
                        background: 'var(--s2)',
                        border: `1px solid ${isModalValueNonConformant ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        color: 'var(--txt)',
                        fontSize: '13px',
                        padding: '8px 12px',
                        fontFamily: F.body,
                        outline: 'none',
                        boxShadow: isModalValueNonConformant ? `0 0 4px ${alpha('var(--danger)', 0.4)}` : 'none',
                      }}
                      placeholder="Ex: 7.2"
                    />
                  </div>

                  {/* Unit */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={modalUnit}
                      onChange={(e) => setModalUnit(e.target.value)}
                      style={{
                        background: 'var(--s2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--txt)',
                        fontSize: '13px',
                        padding: '8px 12px',
                        fontFamily: F.body,
                        outline: 'none',
                      }}
                      placeholder="Ex: mg/L"
                    />
                  </div>
                </div>
              )}

              {/* Real-time Nonconformity Alert */}
              {isModalValueNonConformant && selectedParamObj && (
                <div style={{ color: 'var(--danger)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                  {icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 14, 'var(--danger)')}
                  <span>
                    Fora do limite CONAMA: {selectedParamObj.min_limit !== undefined && selectedParamObj.min_limit !== null ? selectedParamObj.min_limit.toFixed(1) : '0'} a {selectedParamObj.max_limit !== undefined && selectedParamObj.max_limit !== null ? selectedParamObj.max_limit.toFixed(1) : '∞'} {selectedParamObj.unit}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Observações
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  autoComplete="off"
                  rows={2}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                    resize: 'none',
                  }}
                  placeholder="Observações operacionais (opcional)"
                />
              </div>

              {/* Recorded At */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Data/Hora da Leitura
                </label>
                <input
                  type="datetime-local"
                  required
                  value={modalRecordedAt}
                  onChange={(e) => setModalRecordedAt(e.target.value)}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsReadingModalOpen(false)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: 'var(--txt)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    background: 'var(--brand)',
                    color: 'var(--on-brand)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={activeVars} className="min-h-screen">
      <main className="px-6 py-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: F.sora, fontSize: '24px', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: 'var(--txt)' }}>
              Visão Geral
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'var(--txt3)' }}>Status operacional e ambiental em tempo real.</p>
          </div>

          <div style={{ display: 'inline-flex', gap: '3px', padding: '3px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', opacity: isNavPending ? 0.6 : 1 }}>
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                type="button"
                disabled={isNavPending}
                onClick={() => startNav(() => router.push(`/gestor/dashboard?dias=${d}${paramId ? `&paramId=${paramId}` : ''}`, { scroll: false }))}
                style={{
                  padding: '5px 11px',
                  borderRadius: '7px',
                  border: 'none',
                  fontFamily: F.body,
                  fontSize: '12px',
                  fontWeight: diasNum === d ? 600 : 500,
                  background: diasNum === d ? 'var(--s1)' : 'transparent',
                  color: diasNum === d ? 'var(--txt)' : 'var(--txt2)',
                  boxShadow: diasNum === d ? 'var(--shadow-sm)' : 'none',
                  cursor: isNavPending ? 'wait' : 'pointer',
                  transition: 'all .15s',
                }}
              >
                {d === 1 ? '24h' : `${d}d`}
              </button>
            ))}
          </div>
        </div>

        {/* Top Control Grid: ETE Status + Quick Actions */}
        <StatusBlock
          eteStatus={eteStatus}
          activeOperatorName={activeOperatorName}
          activeShiftName={activeShiftName}
          absoluteLatestReading={absoluteLatestReading}
          latestNCToday={latestNCToday}
          onOpenReadingModal={onOpenReadingModal}
          onShowToast={showToast}
        />

        {/* Banner de filtro */}
        {activePointName && (
          <div style={{ background: alpha('var(--brand)', 0.1), border: '1px solid ' + alpha('var(--brand)', 0.3), padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {icon('M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z', 16, 'var(--brand)')}
              <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Filtrando o painel por <strong style={{ fontWeight: 600 }}>{activePointName}</strong></span>
            </div>
            <Link 
              href={`/gestor/dashboard?dias=${diasNum}${paramId ? `&paramId=${paramId}` : ''}`}
              style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}
            >
              Limpar filtro
            </Link>
          </div>
        )}

        {/* Row 1: KPIs */}
        <KpiBlock 
          dbTotalRegistersToday={dbTotalRegistersToday}
          dbRegistersDelta={dbRegistersDelta}
          dbProgress={dbProgress}
          dbOpenOccurrences={dbOpenOccurrences}
          dbConfCurrent={dbConfCurrent}
          dbConfDelta={dbConfDelta}
          dbSparklineData={dbSparklineData}
          diasNum={diasNum}
        />

        {/* Row 2: Charts */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr_1fr] gap-[18px] items-start">
          <TrendBlock 
            dbTrendData={dbTrendData}
            dbSelectedParam={dbSelectedParam}
            dbParameters={dbParameters}
            dbHeatmapPoints={dbHeatmapPoints}
            dbChemicalConsumptionData={dbChemicalConsumptionData}
            diasNum={diasNum}
            paramId={paramId}
            pontoId={pontoId}
            activePointName={activePointName}
            onOpenReadingModal={onOpenReadingModal}
          />
          <HeatmapBlock 
            dbHeatmapPoints={dbHeatmapPoints}
            dbCriticalOccurrences={dbCriticalOccurrences}
            onOpenPointDrawer={handlePointClick}
          />
        </div>

        {/* Row 3: Widgets */}
        <FeedBlock 
          dbProgress={dbProgress}
          dbFeed={dbFeed}
          dbMaintenance={dbMaintenance}
        />

      </main>
      
      {/* Modals & Drawer overlay */}
      {renderPointDrawer()}
      {renderReadingModal()}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            background: toastMessage.type === 'success' ? 'var(--ok)' : toastMessage.type === 'error' ? 'var(--danger)' : 'var(--brand)',
            color: 'var(--on-brand)',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMessage.type === 'success' && icon('M5 13l4 4L19 7', 16, 'currentColor')}
          {toastMessage.type === 'error' && icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 16, 'currentColor')}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  )
}
