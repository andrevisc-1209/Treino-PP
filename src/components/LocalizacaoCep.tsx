import { useRef, useState } from 'react'
import { Field, Input } from '@/components/ui'
import { buscarCep, ErroCep, mascararCep, MENSAGENS_ERRO_CEP, soDigitosCep } from '@/lib/cep'

export type Localizacao = { cep: string; bairro: string; cidade: string; uf: string }

const CLASSE_SOMENTE_LEITURA = 'bg-slate-100 text-slate-700'

/**
 * CEP → bairro (editável), cidade e UF (somente leitura, vêm do CEP via ViaCEP). A consulta é automática ao completar os 8 dígitos.
 * `preservarSalvo`: quem já tem cidade/UF salvas (Configurações) não as perde ao editar o CEP — só são trocadas por uma consulta bem-sucedida.
 */
export function LocalizacaoCep({
  valor,
  onChange,
  preservarSalvo = false,
  erroCep,
  erroLocal,
}: {
  valor: Localizacao
  onChange: (patch: Partial<Localizacao>) => void
  preservarSalvo?: boolean
  erroCep?: string
  erroLocal?: string
}) {
  const [buscando, setBuscando] = useState(false)
  const [erroConsulta, setErroConsulta] = useState<string | null>(null)
  const sequencia = useRef(0)

  const aoDigitar = async (texto: string) => {
    const cep = mascararCep(texto)
    const minha = ++sequencia.current
    setErroConsulta(null)
    if (soDigitosCep(cep).length < 8) {
      setBuscando(false)
      onChange(preservarSalvo ? { cep } : { cep, bairro: '', cidade: '', uf: '' })
      return
    }
    onChange({ cep })
    setBuscando(true)
    try {
      const e = await buscarCep(cep)
      if (minha !== sequencia.current) return
      onChange({ bairro: e.bairro, cidade: e.cidade, uf: e.uf })
    } catch (err) {
      if (minha !== sequencia.current) return
      setErroConsulta(MENSAGENS_ERRO_CEP[err instanceof ErroCep ? err.tipo : 'rede'])
      if (!preservarSalvo) onChange({ bairro: '', cidade: '', uf: '' })
    } finally {
      if (minha === sequencia.current) setBuscando(false)
    }
  }

  const mensagemCep = erroConsulta ?? erroCep
  return (
    <>
      <Field label="CEP" error={mensagemCep}>
        <Input
          value={valor.cep}
          onChange={(e) => void aoDigitar(e.target.value)}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          maxLength={9}
          className={mensagemCep ? 'border-red-600 focus:border-red-600' : undefined}
        />
        {buscando && <span className="mt-1 block text-xs text-slate-500" role="status">Buscando CEP…</span>}
      </Field>
      <Field label="Bairro (opcional)">
        <Input value={valor.bairro} onChange={(e) => onChange({ bairro: e.target.value })} maxLength={120} autoComplete="off" />
      </Field>
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Field label="Cidade" error={erroLocal}>
          <Input value={valor.cidade} readOnly aria-readonly placeholder="Preenchida pelo CEP" className={CLASSE_SOMENTE_LEITURA} tabIndex={-1} />
        </Field>
        <Field label="UF">
          <Input value={valor.uf} readOnly aria-readonly className={CLASSE_SOMENTE_LEITURA} tabIndex={-1} />
        </Field>
      </div>
    </>
  )
}
