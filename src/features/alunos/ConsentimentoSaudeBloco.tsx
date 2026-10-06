import { useState } from 'react'
import { Clock, MailCheck, ShieldAlert } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { dataSP } from '@/lib/datas'
import { formatarDataBR } from '@/lib/format'
import type { ConsentimentoSaude } from './api'

const DIAS_VALIDADE = 7
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function solicitacaoExpirada(enviadoAt: string | null | undefined, agora = Date.now()): boolean {
  if (!enviadoAt) return false
  return new Date(enviadoAt).getTime() + DIAS_VALIDADE * 86_400_000 < agora
}

/**
 * Etapa "Saúde" quando ainda NÃO há consentimento: pede o e-mail do aluno (se faltar), envia a
 * solicitação e mostra o andamento. Os campos de saúde só liberam depois do aluno confirmar.
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
  onEnviar: (email: string) => Promise<void>
  onTermo: () => void
  /** consentimento obtido fora do app (presencial/papel) — mantém o fluxo antigo */
  onJaConsentiu: () => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const status = consentimento?.status ?? null
  const expirada = status === 'pendente' && solicitacaoExpirada(consentimento?.enviadoAt)
  const emailSalvo = (consentimento?.email ?? '').trim()
  const emailAtual = email.trim()
  const temEmail = emailAtual !== ''
  // e-mail já gravado e igual ao do formulário → só mostra; senão, deixa editar
  const somenteLeitura = temEmail && emailAtual === emailSalvo

  const enviar = async () => {
    setErro(null)
    if (!EMAIL_RE.test(emailAtual)) {
      setErro('Informe um e-mail válido do aluno.')
      return
    }
    setEnviando(true)
    try {
      await onEnviar(emailAtual)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (status === 'negado') {
    return (
      <div className="space-y-3" role="status">
        <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>Aluno não autorizou o registro de dados de saúde. Os campos de saúde ficam bloqueados.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Para registrar lesões, cirurgias e medicamentos, o aluno precisa autorizar o tratamento desses dados de saúde (LGPD). Enviamos um e-mail
        para ele confirmar por link.
      </p>
      <button type="button" onClick={onTermo} className="text-sm font-medium text-brand-hover underline">
        Ler termo
      </button>

      {status === 'pendente' && !expirada && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">
          <Clock size={18} className="mt-0.5 shrink-0" />
          <span>
            E-mail enviado em {formatarDataBR(dataSP(consentimento!.enviadoAt!))} para <strong>{emailSalvo}</strong>. Aguardando consentimento do
            aluno — os campos de saúde ficam bloqueados até ele confirmar.
          </span>
        </div>
      )}
      {expirada && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="status">
          <Clock size={18} className="mt-0.5 shrink-0" />
          <span>O link enviado em {formatarDataBR(dataSP(consentimento!.enviadoAt!))} expirou ({DIAS_VALIDADE} dias). Envie novamente.</span>
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
          {!temEmail && <p className="text-xs text-slate-500">Para enviar o consentimento, informe o e-mail do aluno.</p>}
        </div>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <Button type="button" onClick={enviar} disabled={enviando || (!temEmail && !somenteLeitura)} className="w-full">
        <MailCheck size={18} className="mr-2 inline" aria-hidden />
        {enviando
          ? 'Enviando…'
          : status === 'pendente'
            ? 'Reenviar'
            : somenteLeitura
              ? 'Enviar solicitação de consentimento'
              : 'Salvar e-mail e enviar solicitação'}
      </Button>

      <button type="button" onClick={onJaConsentiu} className="w-full text-center text-xs text-slate-500 underline">
        O aluno já consentiu pessoalmente ou por escrito
      </button>
    </div>
  )
}
