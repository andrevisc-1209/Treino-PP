import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { BottomSheet, Input } from '@/components/ui'
import { useAlunos } from '@/features/alunos/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { linkWhatsApp, linkWhatsAppComTexto } from '@/lib/whatsapp'
import { mensagemDaVaga, rotuloDaVaga, type Vaga } from './vagas'

const LIMITE_SEM_BUSCA = 6

/** Alunos para quem oferecer a vaga: cada um tem o seu botão de WhatsApp, com a mensagem pronta; você manda para quem quiser. */
export function OfertaDeVaga({ vaga, excluirAlunoIds = [] }: { vaga: Vaga; excluirAlunoIds?: string[] }) {
  const { session } = useAuth()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const { data: alunos, isLoading } = useAlunos()
  const [busca, setBusca] = useState('')
  const [enviados, setEnviados] = useState<Set<string>>(new Set())

  const candidatos = (alunos ?? []).filter((a) => !excluirAlunoIds.includes(a.id))
  const comTelefone = candidatos.filter((a) => linkWhatsApp(a.phone))
  const semTelefone = candidatos.length - comTelefone.length
  const termo = busca.trim().toLowerCase()
  const visiveis = comTelefone.filter((a) => !termo || a.name.toLowerCase().includes(termo))

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">
        Vaga: <strong>{rotuloDaVaga(vaga)}</strong>. Toque em WhatsApp para mandar a mensagem pronta para quem você quiser.
      </p>
      {isLoading && <p className="text-sm text-slate-600">Carregando alunos…</p>}
      {comTelefone.length > LIMITE_SEM_BUSCA && <Input placeholder="Buscar aluno" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar aluno" />}
      <ul className="divide-y divide-slate-100">
        {visiveis.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-1.5">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
            {enviados.has(a.id) && <span className="text-xs text-slate-600">aberto</span>}
            <a
              href={linkWhatsAppComTexto(a.phone, mensagemDaVaga({ alunoNome: a.name, personalNome: perfil?.name ?? '', vaga }))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setEnviados((s) => new Set(s).add(a.id))}
              aria-label={`Oferecer a vaga a ${a.name} no WhatsApp`}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-sm font-medium text-emerald-800 active:bg-emerald-50"
            >
              <MessageCircle size={16} aria-hidden /> WhatsApp
            </a>
          </li>
        ))}
      </ul>
      {alunos && visiveis.length === 0 && <p className="text-sm text-slate-600">{comTelefone.length === 0 ? 'Nenhum aluno com telefone cadastrado.' : 'Nenhum aluno com esse nome.'}</p>}
      {semTelefone > 0 && <p className="text-xs text-slate-600">{semTelefone} {semTelefone === 1 ? 'aluno não aparece' : 'alunos não aparecem'} por não ter telefone válido.</p>}
    </div>
  )
}

export function OferecerVagaSheet({ vaga, onClose }: { vaga: Vaga | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!vaga} onClose={onClose} title="Oferecer vaga">
      {vaga && <OfertaDeVaga vaga={vaga} />}
    </BottomSheet>
  )
}
