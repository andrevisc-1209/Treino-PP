import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleAlert, CircleCheck, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logoPP from '@/assets/brand/logo-personal-perto-sm.png'
import { Button } from '@/components/ui'

type Estado = 'valido' | 'invalido' | 'expirado' | 'usado' | 'cancelado' | 'confirmado' | 'negado'
type Resposta = { estado: Estado; nome_aluno?: string; nome_personal?: string }

const MENSAGENS: Record<'invalido' | 'expirado' | 'usado' | 'cancelado', { titulo: string; texto: string }> = {
  invalido: { titulo: 'Link inválido', texto: 'Este link não é válido. Peça ao seu personal para enviar uma nova solicitação.' },
  expirado: { titulo: 'Link expirado', texto: 'Este link passou da validade (7 dias). Peça ao seu personal para enviar uma nova solicitação.' },
  usado: { titulo: 'Solicitação já respondida', texto: 'Este link já foi usado. Se quiser mudar sua resposta, fale com o seu personal.' },
  cancelado: { titulo: 'Solicitação cancelada', texto: 'Esta solicitação não está mais ativa. Se necessário, peça ao seu personal para enviar outra.' },
}

async function chamar(token: string, acao: 'consultar' | 'confirmar' | 'negar'): Promise<Resposta> {
  const { data, error } = await supabase.functions.invoke<Resposta>('confirmar-consentimento-saude', { body: { token, acao } })
  if (error || !data) throw new Error('Não foi possível concluir agora. Tente novamente em instantes.')
  return data
}

/** Página pública (sem login): o aluno confirma ou nega o registro dos seus dados de saúde. */
export function ConsentimentoSaudePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const destacarNegar = params.get('negar') === '1'
  const [respostaApi, setResp] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const resp: Resposta | null = token ? respostaApi : { estado: 'invalido' }

  useEffect(() => {
    if (!token) return
    let ativo = true
    chamar(token, 'consultar')
      .then((r) => ativo && setResp(r))
      .catch((e: Error) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [token])

  const responder = async (acao: 'confirmar' | 'negar') => {
    setErro(null)
    setEnviando(true)
    try {
      setResp(await chamar(token, acao))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  const estado = resp?.estado
  const personal = resp?.nome_personal ?? 'seu personal'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <img src={logoPP} alt="Personal Perto" className="mx-auto h-10 w-auto" />

        {!resp && !erro && <p className="py-6 text-center text-sm text-slate-500">Carregando…</p>}
        {!resp && erro && <p className="text-center text-sm text-red-600">{erro}</p>}

        {estado === 'valido' && (
          <div className="space-y-4">
            <div className="flex justify-center text-brand" aria-hidden>
              <ShieldCheck size={44} />
            </div>
            <div className="space-y-2 text-center">
              <h1 className="font-heading text-xl font-bold text-accent">Autorização de dados de saúde</h1>
              <p className="text-sm text-slate-600">
                Olá, <strong>{resp?.nome_aluno}</strong>! <strong>{personal}</strong> pede a sua autorização para registrar no app Treino suas{' '}
                <strong>lesões, cirurgias e uso de medicamentos</strong>.
              </p>
              <p className="text-sm text-slate-600">
                Esses dados servem só para planejar e acompanhar o seu treino com segurança. Não são vendidos nem compartilhados, e você pode pedir
                acesso, correção, exclusão ou revogar a autorização quando quiser, falando com o seu personal (LGPD, art. 11 e 18).
              </p>
              <Link to="/termo" target="_blank" className="text-sm font-medium text-brand-hover underline">
                Ler o termo completo
              </Link>
            </div>
            {erro && <p className="text-center text-sm text-red-600">{erro}</p>}
            <div className="space-y-2">
              <Button
                onClick={() => responder('confirmar')}
                disabled={enviando}
                variant={destacarNegar ? 'outline' : undefined}
                className="w-full"
              >
                Confirmar autorização
              </Button>
              <Button
                onClick={() => responder('negar')}
                disabled={enviando}
                variant={destacarNegar ? undefined : 'outline'}
                className="w-full"
              >
                Não autorizar
              </Button>
            </div>
          </div>
        )}

        {estado === 'confirmado' && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center text-brand" aria-hidden>
              <CircleCheck size={48} />
            </div>
            <h1 className="font-heading text-xl font-bold text-accent">Autorização registrada</h1>
            <p className="text-sm text-slate-600">Obrigado! {personal} já pode registrar seus dados de saúde. Você pode revogar quando quiser.</p>
          </div>
        )}

        {estado === 'negado' && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center text-slate-500" aria-hidden>
              <CircleCheck size={48} />
            </div>
            <h1 className="font-heading text-xl font-bold text-accent">Resposta registrada</h1>
            <p className="text-sm text-slate-600">Você não autorizou o registro de dados de saúde. Nada será registrado.</p>
          </div>
        )}

        {estado && estado in MENSAGENS && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center text-amber-500" aria-hidden>
              <CircleAlert size={48} />
            </div>
            <h1 className="font-heading text-xl font-bold text-accent">{MENSAGENS[estado as keyof typeof MENSAGENS].titulo}</h1>
            <p className="text-sm text-slate-600">{MENSAGENS[estado as keyof typeof MENSAGENS].texto}</p>
          </div>
        )}
      </div>
    </main>
  )
}
