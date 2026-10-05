import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Printer, Share2, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { APP_NAME } from '@/config/app'
import iconMark from '@/assets/brand/icon-mark.png'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import { dataSP, formatarDataCurta, formatarHoraInicioFim, hojeSP, nomeDiaCurto } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import { useItensRecibo, type Fatura } from './api'
import { frequenciaSemanal, notasPorTreino, ordenarItens, pseMedioPorSemana, resumoRecibo, textoCompartilharRecibo } from './recibo'

const NAVY = '#0f2537'
const VERDE = '#367c39'
const EIXO = { fontSize: 11, fill: '#64748b' }

function dataExtensa(dataISO: string): string {
  const [a, m, d] = dataISO.split('-')
  return `${d}/${m}/${a}`
}

function Cartao({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="recibo-bloco rounded-2xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-2xl font-bold" style={{ color: NAVY }}>
        {valor}
      </p>
      <p className="text-xs text-slate-500">{rotulo}</p>
    </div>
  )
}

function BlocoGrafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="recibo-bloco space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/**
 * Recibo visual do ciclo fechado. Tela cheia (portal em <body>); "Baixar PDF" usa a impressão do
 * navegador (CSS @media print em index.css) — nenhuma biblioteca externa nem script de CDN.
 */
export function ReciboCiclo({ fatura, alunoNome, onFechar }: { fatura: Fatura; alunoNome: string; onFechar: () => void }) {
  const { session } = useAuth()
  const { data: perfil } = usePerfilProfissional(session?.user.id)
  const { data: itensBrutos, isLoading, error } = useItensRecibo(fatura.id)
  const [raiz, setRaiz] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'recibo-print-root'
    document.body.appendChild(el)
    setRaiz(el)
    return () => {
      document.body.removeChild(el)
    }
  }, [])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  const itens = useMemo(() => ordenarItens(itensBrutos ?? []), [itensBrutos])
  const resumo = useMemo(() => resumoRecibo(itens), [itens])
  const frequencia = useMemo(() => frequenciaSemanal(itens), [itens])
  const pse = useMemo(() => pseMedioPorSemana(itens), [itens])
  const notas = useMemo(() => notasPorTreino(itens), [itens])

  const personalNome = perfil?.name?.trim() || 'Personal'
  const periodo = `${formatarDataCurta(fatura.periodo_inicio)} a ${formatarDataCurta(fatura.periodo_fim)}`

  const compartilhar = async () => {
    const texto = textoCompartilharRecibo({ alunoNome, personalNome, periodo, resumo, total: fatura.total })
    try {
      if (navigator.share) {
        await navigator.share({ title: `Recibo — ${alunoNome}`, text: texto })
      } else {
        await navigator.clipboard.writeText(texto)
        mostrarInfoGlobal('Resumo copiado.')
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return // a pessoa fechou a folha de compartilhamento
      mostrarErroGlobal('Não foi possível compartilhar. Tente baixar o PDF.')
    }
  }

  if (!raiz) return null

  return createPortal(
    <div id="recibo-conteudo" role="dialog" aria-modal="true" aria-label="Recibo do ciclo" className="fixed inset-0 z-[60] overflow-y-auto bg-slate-100">
      <div className="recibo-sem-impressao sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button type="button" onClick={onFechar} aria-label="Fechar recibo" className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100">
          <X size={20} />
        </button>
        <span className="hidden flex-1 truncate text-sm font-medium text-slate-600 sm:block">Recibo do ciclo</span>
        <span className="flex-1 sm:hidden" />
        <button type="button" onClick={compartilhar} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium active:bg-slate-100" style={{ color: VERDE }}>
          <Share2 size={16} /> Compartilhar
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white" style={{ background: VERDE }}>
          <Printer size={16} /> Baixar PDF
        </button>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-10 print:p-0">
        <header className="recibo-bloco overflow-hidden rounded-2xl" style={{ background: NAVY }}>
          <div className="flex items-center gap-3 p-4">
            <img src={iconMark} alt="" className="h-10 w-auto shrink-0" />
            <div className="min-w-0 text-white">
              <p className="text-xs uppercase tracking-wide text-white/60">Recibo · {APP_NAME}</p>
              <h1 className="truncate text-lg font-bold">{alunoNome}</h1>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-white/10 text-sm text-white">
            <div className="p-3" style={{ background: NAVY }}>
              <dt className="text-xs text-white/60">Personal</dt>
              <dd className="truncate font-medium">{personalNome}</dd>
            </div>
            <div className="p-3" style={{ background: NAVY }}>
              <dt className="text-xs text-white/60">Período do ciclo</dt>
              <dd className="font-medium">{periodo}</dd>
            </div>
          </dl>
        </header>

        {isLoading && <p className="py-8 text-center text-slate-500">Carregando recibo…</p>}
        {error && <p className="py-8 text-center text-red-600">Não foi possível carregar os dados do ciclo.</p>}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Cartao valor={String(resumo.aulasRealizadas)} rotulo="Aulas realizadas" />
              <Cartao valor={String(resumo.diasUnicos)} rotulo="Dias treinados" />
              <Cartao valor={String(resumo.locais.length)} rotulo={resumo.locais.length === 1 ? 'Local' : 'Locais diferentes'} />
              <Cartao valor={formatarBRL(fatura.total)} rotulo="Valor total do ciclo" />
            </div>
            {fatura.ajuste !== 0 && (
              <p className="text-center text-xs text-slate-500">
                Inclui ajuste de {formatarBRL(fatura.ajuste)}
                {fatura.ajuste_descricao ? ` (${fatura.ajuste_descricao})` : ''}.
              </p>
            )}

            <section className="recibo-bloco space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
                Treinos do ciclo
              </h2>
              {itens.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma aula neste ciclo.</p>
              ) : (
                <ol className="divide-y divide-slate-100">
                  {itens.map((i) => {
                    const dia = dataSP(i.starts_at)
                    const ok = i.status === 'presente'
                    return (
                      <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ background: ok ? VERDE : '#b91c1c' }}
                          role="img"
                          aria-label={ok ? 'Presente' : 'Ausente'}
                        >
                          {ok ? <Check size={14} /> : <X size={14} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {nomeDiaCurto(dia)}, {formatarDataCurta(dia)} · {formatarHoraInicioFim(i.starts_at, i.duration_min)}
                          </p>
                          <p className="truncate text-xs text-slate-500">{i.local?.trim() || 'Local não informado'}</p>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">{i.valor != null ? formatarBRL(i.valor) : '—'}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>

            {frequencia.length > 0 && (
              <BlocoGrafico titulo="Frequência semanal (aulas por semana)">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={frequencia} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={EIXO} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={EIXO} width={28} />
                    <Tooltip formatter={(v) => [String(v), 'Aulas']} labelFormatter={(l) => `Semana de ${l}`} />
                    <Bar dataKey="valor" fill={VERDE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </BlocoGrafico>
            )}

            {pse.length >= 2 && (
              <BlocoGrafico titulo="PSE médio por semana (esforço percebido, 0–10)">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={pse} margin={{ top: 8, left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={EIXO} />
                    <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={EIXO} width={28} />
                    <Tooltip formatter={(v) => [String(v), 'PSE médio']} labelFormatter={(l) => `Semana de ${l}`} />
                    <Line type="linear" dataKey="valor" stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </BlocoGrafico>
            )}

            {notas.length >= 2 && (
              <BlocoGrafico titulo="Avaliação do personal por treino (0–10)">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={notas} margin={{ top: 8, left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={EIXO} />
                    <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={EIXO} width={28} />
                    <Tooltip formatter={(v) => [String(v), 'Nota']} labelFormatter={(l) => `Treino de ${l}`} />
                    <Line type="linear" dataKey="valor" stroke={VERDE} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </BlocoGrafico>
            )}
          </>
        )}

        <footer className="pt-2 text-center text-xs text-slate-400">
          <p>Emitido em {dataExtensa(hojeSP())}</p>
          <p>Gerado pelo Treino PP</p>
        </footer>
      </div>
    </div>,
    raiz,
  )
}
