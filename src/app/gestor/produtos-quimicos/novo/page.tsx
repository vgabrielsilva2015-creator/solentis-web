import { ProductForm } from './product-form'
import { BackButton } from '@/components/back-button'

export default function NovoProdutoPage() {
  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <BackButton href="/gestor/produtos-quimicos" label="Produtos Químicos" />
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Novo Produto Químico</h1>
      </div>
      <ProductForm />
    </div>
  )
}
