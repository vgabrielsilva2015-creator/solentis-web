import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, FileCheck, FileDown, Upload, XCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function LaudoPontoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const pontoId = params.id
  // @tenant-safe: deriva o tenant da sessão (JWT), nunca hardcoded — evita IDOR cross-tenant.
  const tenant_id = await getTenantId()

  const ponto = await prisma.collectionPoint.findUnique({
    where: { id: pontoId, tenant_id },
    include: {
      analyses: {
        where: { laboratory_type: 'EXTERNAL' },
        orderBy: { collected_at: 'desc' },
        include: { parameter: true }
      }
    }
  })

  if (!ponto) notFound()

  // Buscar os limites configurados para a matriz deste ponto
  const limitesMatriz = ponto.matrix ? await prisma.parameterLimit.findMany({
    where: { tenant_id, matrix: ponto.matrix },
    include: { parameter: true }
  }) : []

  // Agrupar análises por "Campanha" (Data de coleta + PDF)
  // Como simplificação, agrupamos por YYYY-MM-DD
  const campanhas = ponto.analyses.reduce((acc, analysis) => {
    const key = format(analysis.collected_at, 'yyyy-MM-dd')
    if (!acc[key]) {
      acc[key] = {
        date: analysis.collected_at,
        isConformant: true,
        analyses: []
      }
    }
    acc[key].analyses.push(analysis)
    if (analysis.is_non_conformant) {
      acc[key].isConformant = false
    }
    return acc
  }, {} as Record<string, any>)

  const campanhasList = Object.values(campanhas).sort((a: any, b: any) => b.date.getTime() - a.date.getTime())

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header com Navegação */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Link href="/gestor/laudos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium text-muted-foreground">Voltar para visão geral</span>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {ponto.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="bg-muted/50 text-foreground border-border">
                Matriz: {ponto.matrix || 'Não configurada'}
              </Badge>
              {ponto.location && (
                <span className="text-sm text-muted-foreground">{ponto.location}</span>
              )}
            </div>
          </div>
          
          <Button asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Link href={`/gestor/laudos/importar?ponto=${ponto.id}`}>
              <Upload className="w-4 h-4 mr-2" />
              Registrar Laudo (PDF)
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Histórico de Campanhas */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
                Histórico de Campanhas Legais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campanhasList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhuma campanha registrada para este ponto.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campanhasList.map((campanha: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {campanha.isConformant ? (
                            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                          ) : (
                            <XCircle className="h-5 w-5 text-[var(--alarm)]" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            Campanha {format(campanha.date, "MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span>{format(campanha.date, "dd/MM/yyyy")}</span>
                            <span>•</span>
                            <span>{campanha.analyses.length} parâmetros avaliados</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 flex items-center gap-3">
                        <Badge variant="outline" className={campanha.isConformant ? "text-[var(--success)] border-[var(--success)]/20 bg-[var(--success)]/10" : "text-[var(--alarm)] border-[var(--alarm)]/20 bg-[var(--alarm)]/10"}>
                          {campanha.isConformant ? "Conforme" : "Não conforme"}
                        </Badge>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Tabela de Referência da Matriz */}
        <div className="space-y-6">
          <Card className="border-border bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Tabela de Referência</CardTitle>
              <CardDescription className="text-muted-foreground">
                Limites legais para {ponto.matrix || 'esta matriz'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {limitesMatriz.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  Nenhum limite configurado para a matriz <b>{ponto.matrix || '?'}</b>.
                </div>
              ) : (
                <div className="space-y-3">
                  {limitesMatriz.map((limite) => (
                    <div key={limite.id} className="flex justify-between items-center text-sm p-2 rounded bg-muted/30 border border-border/50">
                      <span className="text-foreground">{limite.parameter.name}</span>
                      <div className="text-muted-foreground font-mono text-xs text-right">
                        {limite.rule_type === 'TETO' && (
                          <span>≤ {limite.max_limit} {limite.parameter.unit}</span>
                        )}
                        {limite.rule_type === 'FAIXA' && (
                          <span>{limite.min_limit} - {limite.max_limit} {limite.parameter.unit}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
