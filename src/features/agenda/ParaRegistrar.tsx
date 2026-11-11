import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { mostrarErroGlobal } from '@/components/Toast'
import { mostrarDesfazer } from '@/components/UndoToast'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { useGuardaCheckIn } from '@/features/pacotes/useGuardaCheckIn'
import { formatarHoraInicioFim } from '@/lib/datas'
import { mapearErroSupabase } from '@/lib/erros'
import { useCheckIn, useDesfazerRegistro, useMarcarFalta, useProfessionalConfig, type Aula } from './api'
import { localCurto } from './proximaAula'
import { mensagemDeAulaRegistrada, mensagemDeFaltaRegistrada, registroComUmToque } from './registroRapido'

const VISIVEIS = 3

/**
 * Hoje: aulas que já passaram e ainda não foram registradas. É o que alimenta a cobrança e a evolução, por isso fica a um toque:
 * "Dei a aula" (presença) e "Faltou" (segue o padrão de cobrança de falta das Configurações), sempre com "Desfazer".
 * Aula em grupo ou com mais de uma opção abre a folha de ações.
 */
export function ParaRegistrar({ aulas, onAbrir }: { aulas: Aula[]; onAbrir: (a: Aula) => void }) {
  const { exigir } = useExigirAssinatura()
  const { data: config } = useProfessionalConfig()
  const checkIn = useCheckIn()
  const marcarFalta = useMarcarFalta()
  const desfazer = useDesfazerRegistro()
  const guardaPacote = useGuardaCheckIn()
  const [todas, setTodas] = useState(false)
  const ocupado = checkIn.isPending || marcarFalta.isPending || desfazer.isPending

  if (aulas.length === 0) return null
  const visiveis = todas ? aulas : aulas.slice(0, VISIVEIS)

  const desfazerRegistro = (aula: Aula, participanteId: string) => () =>
    desfazer.mutate({ aulaId: aula.id, participanteIds: [participanteId] }, { onError: (e) => mostrarErroGlobal(mapearErroSupabase(e)) })

  const deuAAula = async (aula: Aula) => {
    const alvo = registroComUmToque(aula)
    if (!alvo) return onAbrir(aula)
    if (!(await guardaPacote([{ id: alvo.aluno_id, name: alvo.aluno?.name ?? 'Aluno' }]))) return
    checkIn.mutate(
      { aulaId: aula.id, alunoIds: [alvo.aluno_id] },
      {
        onSuccess: () => mostrarDesfazer(mensagemDeAulaRegistrada(alvo.aluno?.name), desfazerRegistro(aula, alvo.id)),
        onError: (e) => mostrarErroGlobal(mapearErroSupabase(e)),
      },
    )
  }

  const faltou = (aula: Aula) => {
    const alvo = registroComUmToque(aula)
    if (!alvo) return onAbrir(aula)
    const cobrar = config?.cobrar_falta_padrao ?? true
    marcarFalta.mutate(
      { aulaId: aula.id, alunoId: alvo.aluno_id, cobrar },
      {
        onSuccess: () => mostrarDesfazer(mensagemDeFaltaRegistrada(alvo.aluno?.name, cobrar), desfazerRegistro(aula, alvo.id)),
        onError: (e) => mostrarErroGlobal(mapearErroSupabase(e)),
      },
    )
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-amber-200" aria-labelledby="para-registrar">
      <div className="mb-1 flex items-start gap-2">
        <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
        <div>
          <h2 id="para-registrar" className="text-sm font-semibold text-slate-900">
            Para registrar ({aulas.length})
          </h2>
          <p className="text-xs text-slate-600">Aulas que já passaram. Registre para entrarem na cobrança e na evolução.</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {visiveis.map((a) => {
          const umToque = !!registroComUmToque(a)
          const nomes = a.aula_participantes.map((p) => p.aluno?.name).filter((n): n is string => !!n)
          const local = localCurto(a.local)
          return (
            <li key={a.id} className="py-2">
              <button type="button" onClick={() => onAbrir(a)} className="flex min-h-11 w-full flex-col items-start justify-center text-left">
                <span className="text-sm font-semibold">
                  {formatarHoraInicioFim(a.starts_at, a.duration_min)} · {nomes.length > 0 ? nomes.join(', ') : 'Aula'}
                </span>
                {local && <span className="text-xs text-slate-600">{local}</span>}
              </button>
              <div className="mt-1 flex gap-2">
                {umToque ? (
                  <>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => exigir(() => void deuAAula(a))()}
                      className="min-h-11 flex-1 rounded-xl bg-brand px-3 text-sm font-semibold text-white active:bg-brand-hover disabled:opacity-50"
                    >
                      Dei a aula
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => exigir(() => faltou(a))()}
                      className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 active:bg-slate-50 disabled:opacity-50"
                    >
                      Faltou
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => onAbrir(a)} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 active:bg-slate-50">
                    Registrar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {aulas.length > VISIVEIS && (
        <button type="button" onClick={() => setTodas((v) => !v)} className="flex min-h-11 w-full items-center justify-center text-sm font-medium text-brand-hover">
          {todas ? 'Mostrar menos' : `Ver as outras ${aulas.length - VISIVEIS}`}
        </button>
      )}
    </section>
  )
}
