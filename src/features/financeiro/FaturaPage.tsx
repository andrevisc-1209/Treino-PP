import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, MessageCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { useAluno, usePesos } from '@/features/alunos/api'
import { useProfessionalConfig } from '@/features/agenda/api'
import { useSessoesDetalhadas } from '@/features/evolucao/api'
import { formatarBRL } from '@/lib/moeda'
import { formatarDataCurta, hojeSP } from '@/lib/datas'
import { gerarPayloadPix } from '@/lib/pix'
import { linkWhatsApp } from '@/lib/whatsapp'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { montarMensagemFatura, resumoTreinoPeriodo } from './mensagem'
import { SeloFatura, estaVencida, rotuloModelo } from './rotulos'
import {
  useCancelarFatura,
  useDesfazerPagamentoFatura,
  useEnviarFatura,
  useFatura,
  useMarcarFaturaPaga,
  type FormaPagamento,
} from './api'

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
]

function periodoLabel(inicio: string, fim: string): string {
  return `${formatarDataCurta(inicio)} a ${formatarDataCurta(fim)}`
}

export function FaturaPage() {
  const { faturaId } = useParams<{ faturaId: string }>()
  const { data: fatura, isLoading } = useFatura(faturaId)
  const { data: aluno } = useAluno(fatura?.aluno_id)
  const { data: config } = useProfessionalConfig()
  const { data: sessoesTodas } = useSessoesDetalhadas(fatura?.aluno_id)
  const { data: pesosTodos } = usePesos(fatura?.aluno_id)

  const enviar = useEnviarFatura()
  const marcarPaga = useMarcarFaturaPaga()
  const desfazer = useDesfazerPagamentoFatura()
  const cancelar = useCancelarFatura()

  const [mensagem, setMensagem] = useState('')
  const [pagamentoAberto, setPagamentoAberto] = useState(false)
  const [dataPagamento, setDataPagamento] = useState(hojeSP())
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<'mensagem' | 'pix' | null>(null)

  const pixDisponivel = !!(config?.pix_chave && config.pix_nome && config.pix_cidade)
  const pixPayload = useMemo(() => {
    if (!fatura || !pixDisponivel || !config) return null
    return gerarPayloadPix({
      chave: config.pix_chave!,
      nome: config.pix_nome!,
      cidade: config.pix_cidade!,
      valor: fatura.total,
      txid: fatura.id.replace(/-/g, '').slice(0, 25),
    })
  }, [fatura, pixDisponivel, config])

  useEffect(() => {
    if (!pixPayload) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(pixPayload, { margin: 1, width: 240 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [pixPayload])

  useEffect(() => {
    if (!fatura || !aluno) return
    const sessoesPeriodo = (sessoesTodas ?? []).filter((s) => s.session_date >= fatura.periodo_inicio && s.session_date <= fatura.periodo_fim)
    const pesosPeriodo = (pesosTodos ?? []).filter((p) => p.measured_at >= fatura.periodo_inicio && p.measured_at <= fatura.periodo_fim)
    const resumo = resumoTreinoPeriodo(sessoesPeriodo, pesosPeriodo)
    const primeiroNome = aluno.name.split(' ')[0]
    setMensagem(
      montarMensagemFatura({
        primeiroNome,
        periodoLabel: periodoLabel(fatura.periodo_inicio, fatura.periodo_fim),
        quantidadeAulas: fatura.qtd_aulas,
        datasAulas: [],
        modelo: fatura.modelo,
        valorUnitario: fatura.modelo === 'por_aula' && fatura.qtd_aulas > 0 ? Math.round((fatura.valor_aulas / fatura.qtd_aulas) * 100) / 100 : null,
        total: fatura.total,
        ajuste: fatura.ajuste,
        ajusteDescricao: fatura.ajuste_descricao,
        vencimentoLabel: fatura.vencimento ? formatarDataCurta(fatura.vencimento) : '—',
        pixPayload,
        resumoTreino: resumo,
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fatura?.id, aluno?.id, pixPayload])

  if (!faturaId) return <Navigate to="/financeiro" replace />
  if (isLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (!fatura) return <p className="p-4 text-slate-500">Fatura não encontrada.</p>

  const vencida = estaVencida(fatura.vencimento, fatura.status, hojeSP())
  const linkBase = linkWhatsApp(aluno?.phone)

  const marcarEnviadaSeNecessario = () => {
    if (fatura.status === 'aberta') enviar.mutate({ faturaId: fatura.id, alunoId: fatura.aluno_id })
  }

  const abrirWhatsApp = () => {
    if (!linkBase) return
    marcarEnviadaSeNecessario()
    window.open(`${linkBase}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer')
  }

  const copiarMensagem = async () => {
    marcarEnviadaSeNecessario()
    try {
      await navigator.clipboard.writeText(mensagem)
      setCopiado('mensagem')
      setTimeout(() => setCopiado(null), 2000)
    } catch {
      // ignora — sem acesso à área de transferência
    }
  }

  const copiarPix = async () => {
    if (!pixPayload) return
    try {
      await navigator.clipboard.writeText(pixPayload)
      setCopiado('pix')
      setTimeout(() => setCopiado(null), 2000)
    } catch {
      // ignora
    }
  }

  const confirmarPagamento = () => {
    marcarPaga.mutate(
      { faturaId: fatura.id, alunoId: fatura.aluno_id, pagaEm: dataPagamento, formaPagamento },
      { onSuccess: () => setPagamentoAberto(false) },
    )
  }

  const confirmarDesfazer = () => {
    const statusAnterior = fatura.enviada_em ? 'enviada' : 'aberta'
    desfazer.mutate({ faturaId: fatura.id, alunoId: fatura.aluno_id, statusAnterior })
  }

  const confirmarCancelar = async () => {
    const ok = await confirmarAcao({
      titulo: 'Cancelar fatura',
      mensagem: 'Cancelar esta fatura? Os itens voltam para o ciclo em aberto.',
      textoConfirmar: 'Cancelar fatura',
      destrutivo: true,
    })
    if (!ok) return
    cancelar.mutate({ faturaId: fatura.id, alunoId: fatura.aluno_id })
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to={fatura.aluno_id ? `/alunos/${fatura.aluno_id}` : '/financeiro'}
          className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{aluno?.name ?? 'Fatura'}</h1>
          <p className="text-sm text-slate-500">{periodoLabel(fatura.periodo_inicio, fatura.periodo_fim)}</p>
        </div>
        <SeloFatura status={fatura.status} vencida={vencida} />
      </header>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Modelo</dt>
            <dd>{rotuloModelo(fatura.modelo)}</dd>
            <dt className="text-slate-500">Aulas</dt>
            <dd>{fatura.qtd_aulas}</dd>
            <dt className="text-slate-500">Valor das aulas</dt>
            <dd>{formatarBRL(fatura.valor_aulas)}</dd>
            {fatura.ajuste !== 0 && (
              <>
                <dt className="text-slate-500">Ajuste{fatura.ajuste_descricao ? ` (${fatura.ajuste_descricao})` : ''}</dt>
                <dd>{formatarBRL(fatura.ajuste)}</dd>
              </>
            )}
            <dt className="text-slate-500">Vencimento</dt>
            <dd>{fatura.vencimento ? formatarDataCurta(fatura.vencimento) : '—'}</dd>
            {fatura.paga_em && (
              <>
                <dt className="text-slate-500">Pago em</dt>
                <dd>
                  {formatarDataCurta(fatura.paga_em)} · {FORMAS.find((f) => f.value === fatura.forma_pagamento)?.label}
                </dd>
              </>
            )}
          </dl>
          <div className="mt-3 rounded-xl bg-slate-100 p-3 text-center">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold">{formatarBRL(fatura.total)}</p>
          </div>
        </div>

        {fatura.status !== 'cancelada' && (
          <div className="flex flex-wrap gap-2">
            {fatura.status !== 'paga' && (
              <Button variant="ghost" onClick={() => setPagamentoAberto(true)} disabled={marcarPaga.isPending}>
                Marcar como paga
              </Button>
            )}
            {fatura.status === 'paga' && (
              <Button variant="ghost" onClick={confirmarDesfazer} disabled={desfazer.isPending}>
                Desfazer pagamento
              </Button>
            )}
            <Button variant="ghost" onClick={confirmarCancelar} disabled={cancelar.isPending} className="text-red-600">
              Cancelar fatura
            </Button>
          </div>
        )}

        {pixDisponivel && pixPayload && (
          <div className="space-y-3 rounded-2xl bg-white p-4 text-center shadow-sm">
            <h2 className="text-left font-semibold">Pix</h2>
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code Pix" className="mx-auto size-48" />}
            <Button variant="ghost" onClick={copiarPix} className="w-full">
              {copiado === 'pix' ? <Check size={18} /> : <Copy size={18} />}
              {copiado === 'pix' ? 'Copiado!' : 'Copiar Pix copia e cola'}
            </Button>
          </div>
        )}

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Mensagem para o aluno</h2>
          <textarea
            className="min-h-56 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
          />
          {linkBase ? (
            <Button onClick={abrirWhatsApp} className="w-full">
              <MessageCircle size={18} /> Abrir WhatsApp
            </Button>
          ) : (
            <Button onClick={copiarMensagem} className="w-full">
              {copiado === 'mensagem' ? <Check size={18} /> : <Copy size={18} />}
              {copiado === 'mensagem' ? 'Copiado!' : 'Copiar mensagem'}
            </Button>
          )}
        </div>
      </div>

      <BottomSheet open={pagamentoAberto} onClose={() => setPagamentoAberto(false)} title="Marcar como paga">
        <div className="space-y-4">
          <Field label="Data do pagamento">
            <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
          </Field>
          <Field label="Forma de pagamento">
            <div className="flex flex-wrap gap-2">
              {FORMAS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormaPagamento(f.value)}
                  className={
                    formaPagamento === f.value
                      ? 'min-h-9 rounded-full border border-brand bg-brand px-3 text-sm font-medium text-white'
                      : 'min-h-9 rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700'
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Field>
          <Button onClick={confirmarPagamento} className="w-full" disabled={marcarPaga.isPending}>
            Confirmar pagamento
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
