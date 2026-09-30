import { useState } from 'react'
import { Button, Field, Input, Switch } from '@/components/ui'
import { mascararCPF, validarCPF } from '@/lib/cpf'
import { mascararTelefone, validarTelefone } from '@/lib/telefone'
import { mapearErroSupabase } from '@/lib/erros'
import { ERROS } from '@/lib/mensagens'
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
  const [cpfTocado, setCpfTocado] = useState(false)
  const [telefone, setTelefone] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const cpfInvalido = !!cpf && !validarCPF(cpf)

  const salvar = async () => {
    if (!nome.trim()) return setErro('Informe seu nome')
    if (!validarCPF(cpf)) return setErro(ERROS.CPF.invalido)
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
      setErro(mapearErroSupabase(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Nome">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </Field>
      <Field label="CPF" error={cpfTocado && cpfInvalido ? ERROS.CPF.invalido : undefined}>
        <Input
          value={cpf}
          onChange={(e) => setCpf(mascararCPF(e.target.value))}
          onBlur={() => setCpfTocado(true)}
          inputMode="numeric"
          placeholder="000.000.000-00"
          className={cpfTocado && cpfInvalido ? 'border-red-600 focus:border-red-600' : undefined}
        />
      </Field>
      <Field label="Telefone">
        <Input value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-600">Aceito receber notificações pelo WhatsApp</span>
        <Switch checked={whatsappOptIn} onChange={setWhatsappOptIn} label="Aceito receber notificações pelo WhatsApp" />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button onClick={salvar} className="w-full" disabled={salvando || cpfInvalido}>
        Concluir
      </Button>
    </div>
  )
}
