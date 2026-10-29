import { useState } from 'react'
import { Field } from '@/components/ui'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { mapearErroSupabase } from '@/lib/erros'
import { formatarDataBR } from '@/lib/format'
import { dataHoraSP } from '@/features/consentimentos/utils'
import { cn } from '@/lib/utils'
import { useAdminContatosDoPersonal, useAdminRegistrarContato } from './api'
import {
  CANAIS_CONTATO,
  LIMITE_OBSERVACAO,
  OPCOES_ADIAR,
  RESULTADOS_CONTATO,
  rotuloCanal,
  rotuloMotivoContato,
  rotuloResultado,
  type CanalContato,
  type ResultadoContato,
} from './contatos'
import { ModalBase } from './ModalBase'

const campo = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm'

/** Registrar um contato com um personal (e, se quiser, esconder o alerta por alguns dias) e ver os contatos anteriores. */
export function ContatoModal({ personal, motivo, onFechar }: { personal: { id: string; nome: string }; motivo: string; onFechar: () => void }) {
  const registrar = useAdminRegistrarContato()
  const historico = useAdminContatosDoPersonal(personal.id)
  const [canal, setCanal] = useState<CanalContato>('whatsapp')
  const [resultado, setResultado] = useState<ResultadoContato>('respondeu')
  const [observacao, setObservacao] = useState('')
  const [adiarDias, setAdiarDias] = useState<number>(0)

  const salvar = async () => {
    try {
      await registrar.mutateAsync({ professionalId: personal.id, motivo, canal, resultado, observacao: observacao.trim(), adiarDias })
      mostrarInfoGlobal(adiarDias > 0 ? `Contato registrado. Alerta adiado por ${adiarDias} dias.` : 'Contato registrado.')
      onFechar()
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  return (
    <ModalBase titulo={`Contato — ${personal.nome}`} onCancelar={onFechar} onConfirmar={salvar} confirmando={registrar.isPending} textoConfirmar="Registrar">
      <div className="max-h-[65vh] space-y-3 overflow-y-auto">
        {motivo !== 'manual' && <p className="text-xs text-slate-600">Alerta: {rotuloMotivoContato(motivo)}</p>}
        <Field label="Como foi o contato?">
          <select value={canal} onChange={(e) => setCanal(e.target.value as CanalContato)} className={campo}>
            {CANAIS_CONTATO.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Resultado">
          <select value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoContato)} className={campo}>
            {RESULTADOS_CONTATO.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.rotulo}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Anotação (opcional, até ${LIMITE_OBSERVACAO} caracteres)`}>
          <textarea
            value={observacao}
            maxLength={LIMITE_OBSERVACAO}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
        <p className="text-xs text-slate-600">Anote só sobre o personal. Não escreva dados de alunos nem de saúde.</p>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Esconder este alerta por…</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Adiar o alerta">
            {OPCOES_ADIAR.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={adiarDias === d}
                onClick={() => setAdiarDias(d)}
                className={cn('min-h-11 rounded-full border px-4 text-sm font-medium', adiarDias === d ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
              >
                {d === 0 ? 'Não esconder' : `${d} dias`}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="mb-1 text-sm font-medium text-slate-700">Contatos anteriores</p>
          {historico.isLoading && <p className="text-xs text-slate-500">Carregando…</p>}
          {historico.data?.length === 0 && <p className="text-xs text-slate-500">Nenhum contato registrado ainda.</p>}
          <ul className="space-y-2">
            {historico.data?.map((c) => (
              <li key={c.id} className="rounded-xl bg-slate-50 p-2 text-xs text-slate-700">
                <p className="font-medium">
                  {rotuloCanal(c.canal)} · {rotuloResultado(c.resultado)}
                </p>
                <p className="text-slate-600">
                  {dataHoraSP(c.criado_em)}
                  {c.admin_nome ? ` · ${c.admin_nome}` : ''}
                  {c.adiar_ate ? ` · alerta adiado até ${formatarDataBR(c.adiar_ate)}` : ''}
                </p>
                {c.observacao && <p className="mt-0.5 whitespace-pre-wrap">{c.observacao}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModalBase>
  )
}
