import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import { buscarArtigos, CATEGORIAS } from './artigos'

export const WHATSAPP_SUPORTE = '(21) 98652-1747'
const TEXTO_SUPORTE = 'Olá! Preciso de ajuda com o app do Personal Perto (Treino).'

export function AjudaPage() {
  const [busca, setBusca] = useState('')
  const encontrados = buscarArtigos(busca)
  const buscando = busca.trim().length > 0

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/configuracoes" className="flex size-12 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Central de ajuda</h1>
      </header>

      <div className="relative mb-4">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar: senha, Pix, aluno…"
          aria-label="Buscar na central de ajuda"
          className="pl-10"
        />
      </div>

      {encontrados.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">
          Não encontramos nada para “{busca.trim()}”. Tente outra palavra ou fale com a gente abaixo.
        </p>
      ) : (
        <div className="space-y-5">
          {CATEGORIAS.map((cat) => {
            const artigos = encontrados.filter((a) => a.categoria === cat.id)
            if (artigos.length === 0) return null
            return (
              <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                <h2 id={`cat-${cat.id}`} className="mb-2 text-sm font-semibold text-slate-600">
                  {cat.titulo}
                </h2>
                <div className="space-y-2">
                  {artigos.map((a) => (
                    <details key={a.id} open={buscando && encontrados.length <= 3} className="group rounded-2xl bg-white shadow-sm">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center px-4 py-2 font-medium">{a.titulo}</summary>
                      <ul className="space-y-2 px-4 pb-4 text-sm text-slate-700">
                        {a.passos.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Não achou o que precisava?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fale com a gente pelo WhatsApp {WHATSAPP_SUPORTE}. Não envie dados de saúde de alunos na conversa.
        </p>
        <a
          href={linkWhatsAppComTexto(WHATSAPP_SUPORTE, TEXTO_SUPORTE)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white active:bg-emerald-800"
        >
          <MessageCircle size={18} aria-hidden />
          Falar no WhatsApp
        </a>
      </section>
    </div>
  )
}
