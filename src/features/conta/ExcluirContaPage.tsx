import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, TriangleAlert } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { mapearErroSupabase } from '@/lib/erros'
import { PALAVRA_CONFIRMACAO, TEXTO_APAGADO, TEXTO_RETIDO, confirmacaoValida, dataDaExclusao, previsaoDaExclusao } from './exclusao'
import { useSolicitarExclusao, type ResultadoSolicitacao } from './api'

/** Configurações → Excluir minha conta: o personal exerce o direito de eliminação dentro do app (LGPD, art. 18, VI). */
export function ExcluirContaPage() {
  const [confirmacao, setConfirmacao] = useState('')
  const [feito, setFeito] = useState<ResultadoSolicitacao | null>(null)
  const solicitar = useSolicitarExclusao()

  if (feito) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-hover">
            <Check size={26} aria-hidden />
          </div>
          <h1 className="text-center text-xl font-bold">Pedido registrado</h1>
          <p className="mt-3 text-sm text-slate-700">
            Sua conta foi bloqueada. Os dados serão apagados de vez em <strong>{dataDaExclusao(feito.prevista_em)}</strong>. Até lá você pode cancelar: é só entrar de novo no app.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            Protocolo: <strong className="select-all">{feito.protocolo}</strong>
          </p>
          <p className="mt-3 text-sm text-slate-600">
            {feito.email_enviado ? 'Enviamos um e-mail com o protocolo e o prazo.' : 'Não conseguimos enviar o e-mail agora. Anote o protocolo acima.'}
          </p>
        </div>
        <Button className="w-full" onClick={() => supabase.auth.signOut()}>
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pb-24">
      <header className="flex items-center gap-2">
        <Link to="/configuracoes" aria-label="Voltar para as configurações" className="flex size-11 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold">Excluir minha conta</h1>
      </header>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Tem certeza que quer excluir sua conta?</h2>
        <p className="text-sm text-slate-700">
          <strong>O que é apagado:</strong> {TEXTO_APAGADO}.
        </p>
        <p className="text-sm text-slate-700">
          <strong>O que fica guardado:</strong> {TEXTO_RETIDO}.
        </p>
        <p className="text-sm text-slate-700">
          <strong>Prazo:</strong> seu acesso é bloqueado agora e tudo é apagado de vez em até 30 dias (até <strong>{previsaoDaExclusao()}</strong>). Até lá você pode cancelar,
          entrando no app. Depois disso não dá para desfazer.
        </p>
        <p className="text-sm text-slate-700">
          <strong>Plano pago:</strong> excluir a conta não devolve o valor do plano em vigor (o direito de desistir em 7 dias, dos Termos de Uso, continua valendo).
        </p>
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>Os dados dos seus alunos também são apagados. Se precisar de algo (como telefones), guarde antes.</span>
        </p>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <Field label={`Digite ${PALAVRA_CONFIRMACAO} para confirmar`}>
          <Input
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={PALAVRA_CONFIRMACAO}
          />
        </Field>
        <Button
          className="w-full bg-red-700 hover:bg-red-800 active:bg-red-800"
          disabled={!confirmacaoValida(confirmacao) || solicitar.isPending}
          onClick={() => solicitar.mutate(confirmacao, { onSuccess: (r) => setFeito(r) })}
        >
          {solicitar.isPending ? 'Registrando…' : 'Confirmar exclusão'}
        </Button>
        {solicitar.error && (
          <p role="alert" className="text-sm text-red-600">
            {mapearErroSupabase(solicitar.error)}
          </p>
        )}
      </section>
    </div>
  )
}
