import { useQuery } from '@tanstack/react-query'
import { Field } from '@/components/ui'
import { buscarMunicipios, UFS } from '@/lib/ibge'

const CLASSE_SELECT =
  'min-h-11 w-full rounded-xl border bg-white px-3 outline-none focus:border-brand disabled:bg-slate-100 disabled:text-slate-400'

/** Estado (27 UFs) → Cidade (municípios do IBGE da UF escolhida). Trocar a UF limpa a cidade. */
export function SeletorCidade({
  uf,
  cidade,
  onChange,
  erroUf,
  erroCidade,
}: {
  uf: string
  cidade: string
  onChange: (uf: string, cidade: string) => void
  erroUf?: string
  erroCidade?: string
}) {
  const { data: municipios, isLoading } = useQuery({
    queryKey: ['ibge-municipios', uf],
    queryFn: () => buscarMunicipios(uf),
    enabled: !!uf,
    staleTime: Infinity,
  })
  // Cidade já salva que não veio na lista (ex.: IBGE fora do ar): mantém como opção pra não "sumir".
  const opcoes = municipios ?? (cidade ? [cidade] : [])

  return (
    <>
      <Field label="Estado" error={erroUf}>
        <select
          value={uf}
          onChange={(e) => onChange(e.target.value, '')}
          className={`${CLASSE_SELECT} ${erroUf ? 'border-red-600' : 'border-slate-300'}`}
        >
          <option value="">Selecione o estado</option>
          {UFS.map((u) => (
            <option key={u.sigla} value={u.sigla}>
              {u.nome}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Cidade" error={erroCidade}>
        <select
          value={cidade}
          onChange={(e) => onChange(uf, e.target.value)}
          disabled={!uf || (isLoading && !cidade)}
          className={`${CLASSE_SELECT} ${erroCidade ? 'border-red-600' : 'border-slate-300'}`}
        >
          <option value="">{!uf ? 'Selecione o estado' : isLoading ? 'Carregando…' : 'Selecione a cidade'}</option>
          {opcoes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
    </>
  )
}
