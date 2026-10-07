import { useState } from 'react'
import { BottomSheet, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MODALIDADES_CONFIG, type ModalidadeTipo, type TipoExecucao } from '@/types/modalidades'

export type TreinoEscolhido = { nome: string; modalidade: ModalidadeTipo; tipoExecucao: TipoExecucao }

/**
 * Passo antes de iniciar um treino que não é de musculação: confirma a modalidade e pergunta se a sessão é
 * presencial ou assíncrona (vem marcado com o que o treino já define, mas pode trocar só para esta vez).
 */
export function EscolhaSessaoSheet({
  treino,
  carregando,
  onCancelar,
  onIniciar,
}: {
  treino: TreinoEscolhido | null
  carregando?: boolean
  onCancelar: () => void
  onIniciar: (tipo: TipoExecucao) => void
}) {
  // o valor escolhido só vale para o treino aberto; ao abrir outro, volta ao padrão dele
  const [escolha, setEscolha] = useState<{ chave: string; tipo: TipoExecucao } | null>(null)
  const chave = treino ? `${treino.nome}|${treino.tipoExecucao}` : ''
  const tipo = escolha && escolha.chave === chave ? escolha.tipo : (treino?.tipoExecucao ?? 'sincrono')
  const cfg = treino ? MODALIDADES_CONFIG[treino.modalidade] : null

  return (
    <BottomSheet open={!!treino} onClose={onCancelar} title={cfg ? `${cfg.emoji} Sessão de ${cfg.label}` : ''}>
      {treino && (
        <div className="space-y-4">
          <p className="font-medium">{treino.nome}</p>
          <div>
            <p className="mb-2 text-sm font-medium">Tipo de sessão</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de sessão">
              {(
                [
                  { v: 'sincrono', t: 'Presencial' },
                  { v: 'assincrono', t: 'Assíncrono' },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={tipo === o.v}
                  onClick={() => setEscolha({ chave, tipo: o.v })}
                  className={cn(
                    'min-h-12 rounded-xl border px-2 text-sm font-medium',
                    tipo === o.v ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-50',
                  )}
                >
                  {o.t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {tipo === 'sincrono'
                ? 'Você registra o resultado agora, com o aluno ali.'
                : 'O treino vai para o aluno pelo WhatsApp, com um link para ele registrar o que fez.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onCancelar} disabled={carregando}>
              Cancelar
            </Button>
            <Button onClick={() => onIniciar(tipo)} disabled={carregando}>
              {carregando ? 'Abrindo…' : 'Iniciar ▶'}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
