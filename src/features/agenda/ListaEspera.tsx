import { useMemo } from 'react'
import { MessageCircle, Trash2 } from 'lucide-react'
import { ListaSkeleton } from '@/components/Skeleton'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarErroGlobal } from '@/components/Toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { limitesDoDiaSP } from '@/lib/datas'
import { mapearErroSupabase } from '@/lib/erros'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import { useAulasNoIntervalo, useBloqueios, useDisponibilidade, useListaEspera, useMarcarEsperaChamada, useProfessionalConfig, useRemoverDaEspera } from './api'
import { parametrosDaConfig } from './disponibilidade'
import { mensagemDaEspera, rotuloTurnoEspera, vagasQueCasam, type EsperaAgenda } from './espera'
import { telefoneDoPedido } from './pedidos'
import { tempoDeEspera, tituloDoDia } from './publica'
import { calcularVagas, type Vaga } from './vagas'

function CartaoEspera({ e, vagas, personalNome }: { e: EsperaAgenda; vagas: Vaga[]; personalNome: string }) {
  const { exigir } = useExigirAssinatura()
  const chamar = useMarcarEsperaChamada()
  const remover = useRemoverDaEspera()
  const casam = vagasQueCasam(e, vagas)

  const tirar = async () => {
    const seguir = await confirmarAcao({
      titulo: 'Tirar da lista de espera?',
      mensagem: `${e.visitante_nome} deixa de aparecer aqui. Nada é enviado a ela.`,
      textoConfirmar: 'Tirar da lista',
      textoCancelar: 'Manter',
      destrutivo: true,
    })
    if (!seguir) return
    try {
      await remover.mutateAsync(e.id)
    } catch (err) {
      mostrarErroGlobal(mapearErroSupabase(err))
    }
  }

  return (
    <li className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
      <div>
        <p className="font-medium">{e.visitante_nome}</p>
        <p className="text-sm text-slate-700">
          {tituloDoDia(e.data)} · {rotuloTurnoEspera(e.turno).toLowerCase()}
        </p>
        <p className="text-xs text-slate-600">
          {telefoneDoPedido(e.visitante_telefone)} · entrou {tempoDeEspera(e.created_at)}
          {e.chamado_em ? ` · chamado ${tempoDeEspera(e.chamado_em)}` : ''}
        </p>
      </div>
      {casam.length > 0 ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">Tem vaga: {casam.map((v) => v.inicio).join(', ')}</p>
      ) : (
        <p className="text-xs text-slate-600">Sem vaga livre nesse dia e turno por enquanto.</p>
      )}
      <div className="flex gap-2">
        {casam.length > 0 && (
          <a
            href={linkWhatsAppComTexto(telefoneDoPedido(e.visitante_telefone), mensagemDaEspera({ nome: e.visitante_nome, personalNome, data: e.data, vagas: casam }))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => exigir(() => chamar.mutate(e.id))()}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-sm font-medium text-emerald-800 active:bg-emerald-50"
          >
            <MessageCircle size={16} aria-hidden /> Chamar no WhatsApp
          </a>
        )}
        <button type="button" onClick={() => void tirar()} aria-label={`Tirar ${e.visitante_nome} da lista de espera`} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50">
          <Trash2 size={16} aria-hidden /> Tirar
        </button>
      </div>
    </li>
  )
}

/** Aba "Espera" da fila de pedidos: quem pediu para ser avisado, com as vagas livres que servem a cada um. Você escolhe quem chamar. */
export function ListaEspera({ ativo }: { ativo: boolean }) {
  const { session } = useAuth()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const { data: espera, isLoading, error } = useListaEspera(ativo)
  const janelas = useDisponibilidade()
  const config = useProfessionalConfig()
  const bloqueios = useBloqueios()

  const datas = (espera ?? []).map((e) => e.data).sort()
  const de = datas[0]
  const ate = datas[datas.length - 1]
  const inicio = de ? limitesDoDiaSP(de).inicio : undefined
  const fim = ate ? limitesDoDiaSP(ate).fim : undefined
  const aulas = useAulasNoIntervalo(inicio, fim)

  const vagas = useMemo(() => {
    if (!de || !ate || !janelas.data || !aulas.data) return []
    return calcularVagas({
      janelas: janelas.data,
      aulas: aulas.data,
      bloqueios: bloqueios.data ?? [],
      parametros: parametrosDaConfig(config.data),
      agora: new Date(),
      de,
      ate,
    })
  }, [de, ate, janelas.data, aulas.data, bloqueios.data, config.data])

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Quem não achou horário na sua página e pediu para ser avisado. Quando aparece uma vaga que serve, você escolhe quem chamar pelo WhatsApp. A espera some em 14 dias.</p>
      {isLoading && <ListaSkeleton linhas={2} />}
      {error && <p className="text-sm text-red-600">{mapearErroSupabase(error)}</p>}
      {espera && espera.length === 0 && <p className="py-4 text-center text-sm text-slate-600">Ninguém na lista de espera.</p>}
      <ul className="space-y-2">
        {(espera ?? []).map((e) => (
          <CartaoEspera key={e.id} e={e} vagas={vagas} personalNome={perfil?.name ?? ''} />
        ))}
      </ul>
    </div>
  )
}
