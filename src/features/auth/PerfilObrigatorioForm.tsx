import { useState } from 'react'
import { Button, Field, Input } from '@/components/ui'
import { mascararCPF, validarCPF } from '@/lib/cpf'
import { mascararTelefone, validarTelefone } from '@/lib/telefone'
import { salvarPerfilProfissional } from './api'

/**
 * Nome + CPF + telefone + preferência de WhatsApp — pedidos uma vez, quando
 * faltam (convite por e-mail em DefinirSenhaPage, ou login social em
 * AuthCallbackPage). O cadastro aberto já pede nome no próprio formulário;
 * CPF/telefone/WhatsApp entram aqui do mesmo jeito nesse caso.
 */
export function PerfilObrigatorioForm({ userId, nomeInicial = '', onConcluido }: { userId: string; nomeInicial?: string; onConcluido: () => void }) {
  const [nome, setNome] = useState(nomeInicial)
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!nome.trim()) return setErro('Informe seu nome')
    if (!validarCPF(cpf)) return setErro('CPF inválido')
    if (!validarTelefone(telefone)) return setErro('Telefone inválido')
    setErro(null)
    setSalvando(true)
    try {
      await salvarPerfilProfissional(userId, {
        name: nome.trim(),
        cpf: cpf.replace(/\D/g, ''),
        phone: telefone.replace(/\D/g, ''),
        whatsappOptIn,
      })
      onConcluido()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Nome">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </Field>
      <Field label="CPF">
        <Input value={cpf} onChange={(e) => setCpf(mascararCPF(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" />
      </Field>
      <Field label="Telefone">
        <Input value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="size-5 accent-brand"
          checked={whatsappOptIn}
          onChange={(e) => setWhatsappOptIn(e.target.checked)}
        />
        Aceito receber notificações pelo WhatsApp
      </label>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button onClick={salvar} className="w-full" disabled={salvando}>
        Concluir
      </Button>
    </div>
  )
}
