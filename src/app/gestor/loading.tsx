import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando...</p>
      </div>
    </div>
  )
}
