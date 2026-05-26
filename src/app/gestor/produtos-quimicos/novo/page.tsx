import Link from 'next/link'
import { ProductForm } from './product-form'

export default function NovoProdutoPage() {
  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <Link href="/gestor/produtos-quimicos" className="text-sm text-slate-400 hover:text-slate-200">
          ← Produtos Químicos
        </Link>
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Novo Produto Químico</h1>
      </div>
      <ProductForm />
    </div>
  )
}
