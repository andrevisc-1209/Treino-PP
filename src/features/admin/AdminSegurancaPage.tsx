import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { dataHoraSP } from '@/features/consentimentos/utils'
import { MfaDesafio } from './MfaDesafio'
import { useIsAdmin } from './useIsAdmin'
import { codigoMfaValido, iniciarCadastroMfa, mensagemErroMfa, removerFatorMfa, useMfa, verificarCodigoMfa, type CadastroMfa } from './mfa'

/** Segurança do admin: cadastro do aplicativo autenticador (TOTP) — segundo fator para abrir o painel. */
export function AdminSegurancaPage() {
  const { session, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const mfa = useMfa()

  if (authLoading || adminLoading || mfa.isLoading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  if (mfa.isError || !mfa.data) return <div className="p-8 text-center text-sm text-red-600">Não foi possível carregar a segurança da conta. Recarregue a página.</div>

  // já tem autenticador cadastrado, mas esta sessão ainda não passou pelo código: pede antes de mostrar/alterar qualquer coisa
  if (mfa.data.estado === 'precisa_codigo') return <MfaDesafio factorId={mfa.data.fatores[0].id} onOk={mfa.recarregar} />

  return <ConteudoSeguranca fatores={mfa.data.fatores} onMudou={mfa.recarregar} />
}

function ConteudoSeguranca({ fatores, onMudou }: { fatores: { id: string; nome: string; criadoEm: string }[]; onMudou: () => void }) {
  const [cadastro, setCadastro] = useState<CadastroMfa | null>(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const iniciar = async () => {
    setErro(null)
    setOcupado(true)
    try {
      setCadastro(await iniciarCadastroMfa())
      setCodigo('')
    } catch (e) {
      mostrarErroGlobal(mensagemErroMfa(e))
    } finally {
      setOcupado(false)
    }
  }

  const confirmar = async () => {
    if (!cadastro) return
    setErro(null)
    setOcupado(true)
    try {
      await verificarCodigoMfa(cadastro.factorId, codigo)
      mostrarInfoGlobal('Autenticador ativado ✓')
      setCadastro(null)
      setCodigo('')
      onMudou()
    } catch (e) {
      setErro(mensagemErroMfa(e))
      setCodigo('')
    } finally {
      setOcupado(false)
    }
  }

  const remover = async (id: string) => {
    if (fatores.length <= 1) {
      const ok = await confirmarAcao({
        titulo: 'Remover o único autenticador?',
        mensagem: 'Sem ele o painel fica protegido só pela senha/Google. Cadastre outro aparelho antes, se quiser manter a proteção.',
        textoConfirmar: 'Remover',
        destrutivo: true,
      })
      if (!ok) return
    }
    setOcupado(true)
    try {
      await removerFatorMfa(id)
      mostrarInfoGlobal('Autenticador removido')
      onMudou()
    } catch (e) {
      mostrarErroGlobal(mensagemErroMfa(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-4">
      <Link to="/admin" className="inline-flex min-h-11 items-center gap-1 text-sm text-slate-600">
        <ArrowLeft size={16} aria-hidden /> Voltar ao painel
      </Link>
      <h1 className="font-heading text-2xl font-bold">Segurança do painel</h1>

      {fatores.length > 0 ? (
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 font-semibold text-emerald-700">
            <ShieldCheck size={20} aria-hidden /> Autenticação em dois fatores ativa
          </p>
          <ul className="space-y-2">
            {fatores.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{f.nome}</span>
                  <span className="text-xs text-slate-500">Cadastrado em {dataHoraSP(f.criadoEm)}</span>
                </span>
                <Button variant="ghost" className="shrink-0 text-red-600" onClick={() => remover(f.id)} disabled={ocupado}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">Dica: cadastre também um segundo aparelho (ou guarde a chave em um gerenciador de senhas) para não depender de um celular só.</p>
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert size={18} aria-hidden /> O painel está protegido só pela senha/Google
          </p>
          <p>Ative um aplicativo autenticador (Google Authenticator, Authy ou o seu gerenciador de senhas) para pedir um código de 6 dígitos ao abrir o painel.</p>
        </div>
      )}

      {cadastro ? (
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">1. No aplicativo autenticador, adicione uma conta lendo o QR Code abaixo.</p>
          <img src={cadastro.qrCode} alt="QR Code para o aplicativo autenticador" className="mx-auto size-48" />
          <div className="rounded-xl bg-slate-50 p-3 text-xs">
            <p className="mb-1 text-slate-500">Ou digite esta chave no aplicativo (guarde-a em um lugar seguro, serve para cadastrar um 2º aparelho):</p>
            <p className="break-all font-mono text-sm font-semibold select-all">{cadastro.segredo}</p>
          </div>
          <p className="text-sm text-slate-600">2. Digite o código de 6 dígitos que o aplicativo mostrar.</p>
          <Field label="Código">
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
            />
          </Field>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setCadastro(null)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={ocupado || !codigoMfaValido(codigo)}>
              {ocupado ? 'Confirmando…' : 'Ativar'}
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={iniciar} className="w-full" disabled={ocupado}>
          {ocupado ? 'Preparando…' : fatores.length > 0 ? 'Cadastrar outro aparelho' : 'Ativar autenticação em dois fatores'}
        </Button>
      )}
    </div>
  )
}
