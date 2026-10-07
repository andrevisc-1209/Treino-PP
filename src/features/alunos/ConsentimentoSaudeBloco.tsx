import { useState } from 'react'
import { Clock, MailCheck, MessageCircle, ShieldAlert } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { dataSP } from '@/lib/datas'
import { formatarDataBR } from '@/lib/format'
import type { ConsentimentoSaude, EnvioConsentimento } from './api'

const DIAS_VALIDADE = 7
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Mesma lista validada na Edge Function (supabase/functions/_shared/consentimento.ts).
const MOTIVOS_REENVIO = [
  'Aluno decidiu liberar acesso',
  "Aluno clicou em 'Não autorizar' por engano",
  'Aluno não recebeu o e-mail',
  'Aluno trocou de e-mail/WhatsApp',
  'Outros',
]

function solicitacaoExpirada(enviadoAt: string | null | undefined, agora = Date.now()): boolean {
  if (!enviadoAt) return false
  return new Date(enviadoAt).getTime() + DIAS_VALIDADE * 86_400_000 < agora
}

/**
 * Etapa "Saúde" quando ainda NÃO há consentimento: pede o e-mail do aluno (se faltar), envia a
 * solicitação por e-mail ou WhatsApp e mostra o andamento. Reenviar (pendente ou negado) exige motivo.
 * Os campos de saúde só liberam depois do aluno confirmar.
 */
export function ConsentimentoSaudeBloco({
  email,
  onEmailChange,
  consentimento,
  onEnviar,
  onTermo,
  onJaConsentiu,
}: {
  /** e-mail atual do formulário (o mesmo campo da etapa 1) */
  email: string
  onEmailChange: (v: string) => void
  consentimento: ConsentimentoSaude | undefined
  onEnviar: (envio: EnvioConsentimento) => Promise<void>
  onTermo: () => void
  /** consentimento obtido fora do app (presencial/papel) — mantém o fluxo antigo */
  onJaConsentiu: () => void
}) {
  const [enviando, setEnviando] = useState<'email' | 'whatsapp' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [reenviando, setReenviando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [motivoLivre, setMotivoLivre] = useState('')

  const status = consentimento?.status ?? null
  const negado = status === 'negado'
  const expirada = status === 'pendente' && solicitacaoExpirada(consentimento?.enviadoAt)
  const emailSalvo = (consentimento?.email ?? '').trim()
  const emailAtual = email.trim()
  const temEmail = emailAtual !== ''
  // e-mail já gravado e igual ao do formulário → só mostra; senão, deixa editar
  const somenteLeitura = temEmail && emailAtual === emailSalvo

  // Reenvio: já houve solicitação (pendente ou negada). Pede o motivo antes de enviar.
  const jaSolicitado = status === 'pendente' || negado
  const mostrarEnvio = !jaSolicitado || reenviando
  const motivoOk = motivo !== '' && (motivo !== 'Outros' || motivoLivre.trim().length >= 3)
  const podeEnviar = !enviando && (!jaSolicitado || motivoOk)

  const enviar = async (canal: 'email' | 'whatsapp') => {
    setErro(null)
    if (canal === 'email' && !EMAIL_RE.test(emailAtual)) {
      setErro('Informe um e-mail válido do aluno.')
      return
    }
    setEnviando(canal)
    try {
      await onEnviar({
        canal,
        email: canal === 'email' ? emailAtual : undefined,
        motivo: jaSolicitado ? motivo : undefined,
        motivoLivre: jaSolicitado && motivo === 'Outros' ? motivoLivre : undefined,
      })
      setReenviando(false)
      setMotivo('')
      setMotivoLivre('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(null)
    }
  }

  return (
    <div className="space-y-4">
      {negado ? (
        <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700" role="status">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>Aluno não autorizou o registro de dados de saúde. Os campos de saúde ficam bloqueados.</span>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Para registrar lesões, cirurgias e medicamentos, o aluno precisa autorizar o tratamento desses dados de saúde (LGPD). Enviamos um
            link para ele confirmar, por e-mail ou WhatsApp.
          </p>
          <button type="button" onClick={onTermo} className="text-sm font-medium text-brand-hover underline">
            Ler termo
          </button>
        </>
      )}

      {status === 'pendente' && !expirada && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">
          <Clock size={18} className="mt-0.5 shrink-0" />
          <span>
            Solicitação enviada em {formatarDataBR(dataSP(consentimento!.enviadoAt!))}
            {emailSalvo ? <> (e-mail para <strong>{emailSalvo}</strong>, ou link por WhatsApp)</> : null}. Aguardando consentimento do aluno — os
            campos de saúde ficam bloqueados até ele confirmar.
          </span>
        </div>
      )}
      {expirada && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="status">
          <Clock size={18} className="mt-0.5 shrink-0" />
          <span>O link enviado em {formatarDataBR(dataSP(consentimento!.enviadoAt!))} expirou ({DIAS_VALIDADE} dias). Envie novamente.</span>
        </div>
      )}

      {jaSolicitado && !reenviando && (
        <Button type="button" variant="outline" onClick={() => setReenviando(true)} className="w-full">
          Reenviar solicitação
        </Button>
      )}

      {mostrarEnvio && (
        <div className="space-y-4">
          {jaSolicitado && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <label className="text-sm font-medium" htmlFor="motivo-reenvio">
                Motivo do reenvio (obrigatório)
              </label>
              <select
                id="motivo-reenvio"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand"
              >
                <option value="">Selecione…</option>
                {MOTIVOS_REENVIO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {motivo === 'Outros' && (
                <textarea
                  aria-label="Descreva o motivo"
                  placeholder="Descreva o motivo"
                  value={motivoLivre}
                  onChange={(e) => setMotivoLivre(e.target.value)}
                  maxLength={300}
                  className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
                />
              )}
            </div>
          )}

          {somenteLeitura ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">E-mail do aluno: </span>
              <span className="font-medium">{emailAtual}</span>
              <button type="button" onClick={() => onEmailChange('')} className="ml-2 text-xs text-brand-hover underline">
                Trocar
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="consent-email">
                E-mail do aluno
              </label>
              <Input
                id="consent-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="aluno@exemplo.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
              />
              {!temEmail && <p className="text-xs text-slate-500">Para enviar por e-mail, informe o e-mail do aluno. Por WhatsApp não precisa.</p>}
            </div>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={() => enviar('email')} disabled={!podeEnviar || (!temEmail && !somenteLeitura)} className="w-full">
              <MailCheck size={18} className="mr-2 inline" aria-hidden />
              {enviando === 'email' ? 'Enviando…' : jaSolicitado ? 'Reenviar por e-mail' : somenteLeitura ? 'Enviar por e-mail' : 'Salvar e-mail e enviar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => enviar('whatsapp')} disabled={!podeEnviar} className="w-full">
              <MessageCircle size={18} className="mr-2 inline" aria-hidden />
              {enviando === 'whatsapp' ? 'Gerando link…' : 'Enviar via WhatsApp'}
            </Button>
          </div>
          {reenviando && (
            <button type="button" onClick={() => setReenviando(false)} className="w-full text-center text-xs text-slate-500 underline">
              Cancelar reenvio
            </button>
          )}
        </div>
      )}

      {erro && !mostrarEnvio && <p className="text-sm text-red-600">{erro}</p>}

      {!negado && (
        <button type="button" onClick={onJaConsentiu} className="w-full text-center text-xs text-slate-500 underline">
          O aluno já consentiu pessoalmente ou por escrito
        </button>
      )}
    </div>
  )
}
