import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Beaker, FileCheck, Search, SlidersHorizontal, Upload, Download } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LaudosExternosPage() {
  const pontos = await prisma.collectionPoint.findMany({
    where: { tenant_id: 'default', is_active: true },
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <FileCheck className="h-8 w-8 text-[var(--brand)]" />
            Laudos Externos
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Gestão de campanhas legais e laudos laboratoriais por ponto de coleta
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar ponto de coleta..." 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <Button variant="outline" size="icon" className="border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Link href={`/api/export?type=external_analyses`} target="_blank">
            <Button variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-300 hover:text-slate-200 hover:bg-slate-800 h-10 px-3">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de Pontos de Coleta */}
      {pontos.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
              <Beaker className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-200">Nenhum ponto de coleta</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
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
              <Card key={ponto.id} className="border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-200">
                        {ponto.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-slate-400 mt-1">
                        {ponto.matrix ? (
                          <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
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
                      <span className="text-slate-500">Último Laudo: </span>
                      {lastAnalysis ? (
                        <span className="text-slate-300 font-medium">
                          {lastAnalysis.collected_at.toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Nenhum registro</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" className="flex-1 border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300">
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
