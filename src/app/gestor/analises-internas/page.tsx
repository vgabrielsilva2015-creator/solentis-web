import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Beaker, Check, Save, TrendingDown, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnalisesInternasGridPage() {
  const rawPontos = await prisma.collectionPoint.findMany({
    where: { tenant_id: 'default', is_active: true },
    orderBy: { name: 'asc' },
  })

  const pontos = await Promise.all(
    rawPontos.map(async (ponto) => {
      let parameter_limits: any[] = []
      if (ponto.matrix) {
        parameter_limits = await prisma.parameterLimit.findMany({
          where: { tenant_id: ponto.tenant_id, matrix: ponto.matrix },
          include: { parameter: true }
        })
      }
      return { ...ponto, parameter_limits }
    })
  )

  // Simulação de preenchimento rápido (seria um Client Component na versão final)
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Activity className="h-8 w-8 text-[var(--brand)]" />
            Análises Internas
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Lançamento rápido e acompanhamento de rotina operacional
          </p>
        </div>
        
        <Button className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <div className="space-y-6">
        {pontos.map(ponto => {
          // Apenas pontos que tenham limites configurados para não ficar vazio
          if (ponto.parameter_limits.length === 0) return null

          return (
            <Card key={ponto.id} className="border-slate-800 bg-slate-900/40">
              <CardHeader className="pb-3 border-b border-slate-800/50 bg-slate-800/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[var(--brand)]/10 text-[var(--brand)]">
                      <Beaker className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-200">{ponto.name}</CardTitle>
                      <CardDescription className="text-sm text-slate-400">
                        {ponto.matrix ? `Matriz: ${ponto.matrix}` : 'Rotina Operacional'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-950/30 text-emerald-400 border-emerald-900/50">
                    <Check className="w-3 h-3 mr-1" /> Atualizado há 2h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3 font-medium w-64">Parâmetro</th>
                        <th className="px-6 py-3 font-medium w-48">Valor Medido</th>
                        <th className="px-6 py-3 font-medium w-32">Limite (LQ)</th>
                        <th className="px-6 py-3 font-medium text-right">Tendência (24h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {ponto.parameter_limits.map((limit, idx) => (
                        <tr key={limit.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-300">{limit.parameter.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {limit.rule_type === 'FAIXA' 
                                ? `Faixa: ${limit.min_limit} - ${limit.max_limit} ${limit.parameter.unit}` 
                                : `Máx: ${limit.max_limit} ${limit.parameter.unit}`}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                className="w-24 h-9 bg-slate-900 border-slate-700 focus-visible:ring-[var(--brand)] text-slate-200"
                                defaultValue={idx % 2 === 0 ? "7.2" : ""}
                              />
                              <span className="text-slate-500 text-xs">{limit.parameter.unit}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-[var(--brand)] focus:ring-[var(--brand)]" />
                              <span className="text-xs text-slate-400 font-medium">&lt; LQ</span>
                            </label>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {/* Sparkline Simulada */}
                            <div className="flex items-center justify-end gap-3">
                              {idx % 2 === 0 ? (
                                <div className="flex items-center text-emerald-400 text-xs gap-1 font-medium bg-emerald-950/30 px-2 py-1 rounded">
                                  <TrendingDown className="w-3 h-3" />
                                  -12%
                                </div>
                              ) : (
                                <div className="flex items-center text-amber-400 text-xs gap-1 font-medium bg-amber-950/30 px-2 py-1 rounded">
                                  <TrendingUp className="w-3 h-3" />
                                  +5%
                                </div>
                              )}
                              <svg className="w-16 h-6 stroke-slate-500" fill="none" viewBox="0 0 100 24">
                                {idx % 2 === 0 ? (
                                  <path d="M0 12 Q 25 24, 50 12 T 100 20" strokeWidth="2" strokeLinecap="round" />
                                ) : (
                                  <path d="M0 20 Q 25 5, 50 15 T 100 5" strokeWidth="2" strokeLinecap="round" />
                                )}
                              </svg>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {pontos.filter(p => p.parameter_limits.length > 0).length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-lg bg-slate-900/20">
            <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">Nenhuma configuração encontrada</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              Para usar a grid de preenchimento rápido, cadastre limites e parâmetros de rotina para os pontos de coleta na tela de Parâmetros.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
