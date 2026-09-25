import { useEffect, useState } from 'react'

// Toast com "Desfazer" para ações reversíveis e de baixo risco (arquivar
// aluno, remover um exercício) — evita interromper o fluxo com uma
// confirmação quando dá pra simplesmente desfazer depois.

type PedidoDesfazer = { id: number; mensagem: string; onDesfazer: () => void }

type Ouvinte = (pedido: PedidoDesfazer) => void
const ouvintes = new Set<Ouvinte>()

export function mostrarDesfazer(mensagem: string, onDesfazer: () => void) {
  const id = Date.now() + Math.random()
  ouvintes.forEach((fn) => fn({ id, mensagem, onDesfazer }))
}

export function UndoToastHost() {
  const [pedidos, setPedidos] = useState<PedidoDesfazer[]>([])

  useEffect(() => {
    const ouvinte: Ouvinte = (p) => {
      setPedidos((atual) => [...atual, p])
      setTimeout(() => setPedidos((atual) => atual.filter((x) => x.id !== p.id)), 6000)
    }
    ouvintes.add(ouvinte)
    return () => {
      ouvintes.delete(ouvinte)
    }
  }, [])

  const desfazer = (p: PedidoDesfazer) => {
    p.onDesfazer()
    setPedidos((atual) => atual.filter((x) => x.id !== p.id))
  }

  if (pedidos.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-16 z-[60] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
      {pedidos.map((p) => (
        <div key={p.id} className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <span>{p.mensagem}</span>
          <button onClick={() => desfazer(p)} className="shrink-0 font-semibold text-emerald-400">
            Desfazer
          </button>
        </div>
      ))}
    </div>
  )
}
