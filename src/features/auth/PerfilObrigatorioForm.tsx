import { useState } from 'react'
import { Button, Field, Input, Switch } from '@/components/ui'
import { mascararCPF, validarCPF } from '@/lib/cpf'
import { mascararTelefone, validarTelefone } from '@/lib/telefone'
import { mapearErroSupabase } from '@/lib/erros'
import { LocalizacaoCep, type Localizacao } from '@/components/LocalizacaoCep'
import { cepCompleto } from '@/lib/cep'
import { ERROS } from '@/lib/mensagens'
import { TERMOS_USO_VERSAO, PRIVACIDADE_VERSAO } from '@/features/legal/textos'
import { registrarAceiteTermos, salvarPerfilProfissional } from './api'
import { useCadastroExistente } from './verificarCadastro'

/**
 * Nome + CPF + telefone + preferência de WhatsApp — pedidos uma vez, quando
 * faltam (convite por e-mail em DefinirSenhaPage, ou login social em
 * AuthCallbackPage). O cadastro aberto já pede nome no próprio formulário;
 * CPF/telefone/WhatsApp entram aqui do mesmo jeito nesse caso.
 */
export function PerfilObrigatorioForm({
  userId,
  nomeInicial = '',
  cpfInicial = '',
  whatsappInicial = true,
  pedirAceite = true,
  onConcluido,
}: {
  userId: string
  nomeInicial?: string
  /** CPF já informado no cadastro: aparece só para conferência (não dá para trocar) */
  cpfInicial?: string
  /** o seletor do WhatsApp mora aqui, junto do telefone; começa ligado (decisão do dono) e a pessoa desliga se quiser */
  whatsappInicial?: boolean
  /** false quando o aceite dos Termos já foi registrado no cadastro (não pede de novo nem grava outro) */
  pedirAceite?: boolean
  onConcluido: () => void
}) {
  const [nome, setNome] = useState(nomeInicial)
  const [cpf, setCpf] = useState(cpfInicial ? mascararCPF(cpfInicial) : '')
  const [cpfTocado, setCpfTocado] = useState(false)
  const [telefone, setTelefone] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(whatsappInicial)
  // quem entra pelo Google ou por convite não passa pelo cadastro com o aceite: registra aqui (o servidor guarda versão, hora e IP)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [local, setLocal] = useState<Localizacao>({ cep: '', bairro: '', cidade: '', uf: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const cpfInvalido = !!cpf && !validarCPF(cpf)
  // CPF digitado completo que já é de OUTRA conta (a função ignora a própria): avisa antes de salvar
  const cpfDeOutraConta = useCadastroExistente('cpf', cpf, !cpfInicial && validarCPF(cpf)) === true

  const salvar = async () => {
    if (!nome.trim()) return setErro('Informe seu nome')
    if (!validarCPF(cpf)) return setErro(ERROS.CPF.invalido)
    if (cpfDeOutraConta) return setErro(ERROS.CPF.duplicado)
    if (!validarTelefone(telefone)) return setErro('Telefone inválido')
    if (pedirAceite && !aceitouTermos) return setErro('Aceite os Termos de Uso e a Política de Privacidade para continuar')
    if (!cepCompleto(local.cep) || !local.uf || !local.cidade) return setErro('Informe um CEP válido para preencher cidade e estado')
    setErro(null)
    setSalvando(true)
    try {
      await salvarPerfilProfissional(userId, {
        name: nome.trim(),
        cpf: cpf.replace(/\D/g, ''),
        phone: telefone.replace(/\D/g, ''),
        whatsappOptIn,
        uf: local.uf,
        cidade: local.cidade,
        bairro: local.bairro,
      })
      if (pedirAceite) await registrarAceiteTermos(TERMOS_USO_VERSAO, PRIVACIDADE_VERSAO)
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
          readOnly={!!cpfInicial}
          className={cpfInicial ? 'bg-slate-50 text-slate-600' : cpfTocado && cpfInvalido ? 'border-red-600 focus:border-red-600' : undefined}
        />
      </Field>
      {cpfDeOutraConta && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Este CPF já está cadastrado em outra conta. Se for você, saia e entre com o e-mail e a senha dessa conta (ou use "Esqueci minha senha"). Se não
          reconhece, fale com o suporte.
        </p>
      )}
      <Field label="Telefone">
        <Input value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-600">Receber no WhatsApp a agenda do dia e os avisos do app (você desliga quando quiser)</span>
        <Switch checked={whatsappOptIn} onChange={setWhatsappOptIn} label="Receber agenda do dia e avisos pelo WhatsApp" />
      </div>
      <LocalizacaoCep valor={local} onChange={(patch) => setLocal((l) => ({ ...l, ...patch }))} />
      {pedirAceite && (
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitouTermos(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-brand" />
          <span>
            Li e aceito os{' '}
            <a href="/termos" target="_blank" rel="noreferrer" className="font-medium text-brand-hover underline">
              Termos de Uso
            </a>{' '}
            e a{' '}
            <a href="/privacidade" target="_blank" rel="noreferrer" className="font-medium text-brand-hover underline">
              Política de Privacidade
            </a>
            .
          </span>
        </label>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button onClick={salvar} className="w-full" disabled={salvando || cpfInvalido || cpfDeOutraConta || (pedirAceite && !aceitouTermos)}>
        Concluir
      </Button>
    </div>
  )
}
