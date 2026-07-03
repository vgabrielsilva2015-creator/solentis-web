import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Beaker, FileCheck, Search, SlidersHorizontal, Upload, Download } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LaudosExternosPage() {
  // @tenant-safe: deriva o tenant da sessão (JWT), nunca hardcoded.
  const tenant_id = await getTenantId()
  const pontos = await prisma.collectionPoint.findMany({
    where: { tenant_id, is_active: true },
    orderBy: { name: 'asc' },
    include: {
      analyses: {
        where: { laboratory_type: 'EXTERNAL' },
        orderBy: { collected_at: 'desc' },
        take: 1
      }
    }
  })

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCheck className="h-8 w-8 text-[var(--brand)]" />
            Laudos Externos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestão de campanhas legais e laudos laboratoriais por ponto de coleta
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar ponto de coleta..." 
              className="w-full bg-card/50 border border-border rounded-md pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <Button variant="outline" size="icon" className="border-border bg-card/50 text-muted-foreground hover:text-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Link href={`/api/export?type=external_analyses`} target="_blank">
            <Button variant="outline" className="border-border bg-card/50 text-foreground hover:text-foreground hover:bg-muted h-10 px-3">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de Pontos de Coleta */}
      {pontos.length === 0 ? (
        <Card className="border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Beaker className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Nenhum ponto de coleta</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Cadastre pontos de coleta com matriz de referência legal para começar a registrar laudos.
            </p>
            <Button className="mt-6 bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
              Configurar Pontos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pontos.map((ponto) => {
            const lastAnalysis = ponto.analyses[0]
            
            return (
              <Card key={ponto.id} className="border-border bg-card/40 hover:bg-card/60 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {ponto.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground mt-1">
                        {ponto.matrix ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                            Matriz: {ponto.matrix}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-900/50">
                            Matriz não configurada
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Último Laudo: </span>
                      {lastAnalysis ? (
                        <span className="text-foreground font-medium">
                          {lastAnalysis.collected_at.toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Nenhum registro</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" className="flex-1 border-border bg-muted/50 hover:bg-muted text-foreground">
                        <Link href={`/gestor/laudos/${ponto.id}`}>
                          Ver Histórico
                        </Link>
                      </Button>
                      <Button asChild className="flex-1 bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 border-0">
                        <Link href={`/gestor/laudos/importar?ponto=${ponto.id}`}>
                          <Upload className="w-4 h-4 mr-2" />
                          Registrar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
