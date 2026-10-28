import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Copy, Download, FileSpreadsheet, Info, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hojeSP } from '@/lib/datas'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarInfoGlobal } from '@/components/Toast'
import { mapearErroSupabase } from '@/lib/erros'
import { useAlunos } from '../api'
import { decodificarArquivo } from './csv'
import { LIMITE_IMPORTACAO, MODELO_CSV, TAMANHO_MAXIMO_ARQUIVO, lerPlanilha, resumoLeitura, selecionadasPorPadrao, type LinhaImportada, type StatusLinha } from './importarAlunos'
import { useDesfazerImportacao, useImportarAlunos } from './api'
import { limparTextoColado, montarPromptIA } from './promptIA'
import { viaInicial, type Via } from './via'

const ROTULO: Record<StatusLinha, string> = { ok: 'Pronto', aviso: 'Com aviso', duplicado: 'Já existe', erro: 'Com erro' }
const COR: Record<StatusLinha, string> = {
  ok: 'bg-brand-soft text-brand-hover',
  aviso: 'bg-amber-100 text-amber-900',
  duplicado: 'bg-slate-200 text-slate-800',
  erro: 'bg-red-100 text-red-800',
}

function baixarModelo() {
  // BOM para o Excel abrir com acentos certos
  const blob = new Blob(['﻿' + MODELO_CSV], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-alunos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** Importar alunos por planilha (CSV): só dados básicos, com revisão antes de gravar e opção de desfazer. */
export function ImportarAlunosPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [via, setVia] = useState<Via>(() => viaInicial(params.get('via')))
  const { data: existentes } = useAlunos()
  const importar = useImportarAlunos()
  const desfazer = useDesfazerImportacao()
  const entrada = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<string | null>(null)
  const [linhas, setLinhas] = useState<LinhaImportada[] | null>(null)
  const [ignoradas, setIgnoradas] = useState<string[]>([])
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set())
  const [criados, setCriados] = useState<string[] | null>(null)
  const [restantes, setRestantes] = useState<{ quantidade: number; texto: string } | null>(null)
  const [colado, setColado] = useState('')
  const [promptCopiado, setPromptCopiado] = useState(false)

  const processar = (texto: string, origem: string) => {
    const r = lerPlanilha(limparTextoColado(texto), existentes ?? [], hojeSP())
    if (!r.ok) return setErro(r.erro)
    setArquivo(origem)
    setLinhas(r.linhas)
    setIgnoradas(r.colunasIgnoradas)
    setRestantes(r.restantes)
    setMarcadas(new Set(selecionadasPorPadrao(r.linhas)))
  }

  const escolher = async (f: File | undefined) => {
    setErro(null)
    setLinhas(null)
    if (!f) return
    if (f.size > TAMANHO_MAXIMO_ARQUIVO) return setErro('O arquivo é grande demais. Divida a planilha em partes menores.')
    if (!/\.(csv|txt)$/i.test(f.name)) return setErro('Use um arquivo CSV. No Excel ou Google Planilhas: Arquivo → Salvar como/Fazer download → CSV.')
    processar(decodificarArquivo(await f.arrayBuffer()), f.name)
  }

  const conferirColado = () => {
    setErro(null)
    setLinhas(null)
    if (!colado.trim()) return setErro('Cole aqui o texto que a IA devolveu.')
    if (colado.length > TAMANHO_MAXIMO_ARQUIVO) return setErro('O texto é grande demais. Mande a lista em partes menores.')
    processar(colado, 'Texto colado')
  }

  const copiarPrompt = async () => {
    const texto = montarPromptIA()
    try {
      await navigator.clipboard.writeText(texto)
      setPromptCopiado(true)
      setTimeout(() => setPromptCopiado(false), 3000)
    } catch {
      window.prompt('Copie o prompt:', texto) // navegador sem permissão de área de transferência
    }
  }

  const alternar = (n: number) =>
    setMarcadas((prev) => {
      const novo = new Set(prev)
      if (novo.has(n)) novo.delete(n)
      else novo.add(n)
      return novo
    })

  const confirmar = () => {
    if (!linhas) return
    const alunos = linhas.filter((l) => marcadas.has(l.linha) && l.aluno).map((l) => l.aluno!)
    if (alunos.length === 0) return
    importar.mutate(alunos, { onSuccess: (ids) => setCriados(ids) })
  }

  const desfazerTudo = async () => {
    if (!criados) return
    const ok = await confirmarAcao({
      titulo: 'Desfazer a importação',
      mensagem: `Isso apaga de vez os ${criados.length} alunos que acabaram de ser importados. Só use se a planilha veio errada.`,
      textoConfirmar: 'Apagar os importados',
      destrutivo: true,
    })
    if (!ok) return
    desfazer.mutate(criados, {
      onSuccess: () => {
        mostrarInfoGlobal('Importação desfeita.')
        setCriados(null)
        setLinhas(null)
        setArquivo(null)
      },
    })
  }

  // ---- depois de importar ----
  if (criados) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-hover">
            <Check size={26} aria-hidden />
          </div>
          <h1 className="text-xl font-bold">{criados.length === 1 ? '1 aluno importado' : `${criados.length} alunos importados`}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Eles entraram só com os dados básicos. Complete cobrança e horários na ficha de cada um. Dados de saúde só entram com o consentimento do aluno.
          </p>
        </div>
        {restantes && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">
              Sua lista tinha mais alunos: {restantes.quantidade === 1 ? 'ficou 1 para importar agora' : `ficaram ${restantes.quantidade} para importar agora`} (o limite é {LIMITE_IMPORTACAO} por vez).
            </p>
            <Button
              className="mt-3 w-full"
              onClick={() => {
                const texto = restantes.texto
                setCriados(null)
                setLinhas(null)
                setMarcadas(new Set())
                processar(texto, 'Restantes da lista')
              }}
            >
              Importar {restantes.quantidade === 1 ? 'o restante' : `os ${restantes.quantidade} restantes`}
            </Button>
          </div>
        )}
        <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm" aria-label="Próximos passos">
          <h2 className="font-semibold">Agora, o que falta</h2>
          <p className="text-sm text-slate-700">
            Cada aluno importado ainda precisa de <strong>valor da cobrança</strong> e <strong>horários</strong>: abra a ficha dele para completar. Depois, monte um treino.
          </p>
          <Link to="/meus-treinos/planejados" className="flex min-h-11 items-center text-sm font-medium text-brand-hover underline">
            Montar um treino planejado
          </Link>
        </section>
        <Button className="w-full" variant={restantes ? 'outline' : 'primary'} onClick={() => navigate('/alunos')}>
          Ver meus alunos e completar as fichas
        </Button>
        <Button variant="outline" className="w-full text-red-700" onClick={desfazerTudo} disabled={desfazer.isPending}>
          Desfazer a importação
        </Button>
        {desfazer.error && <p className="text-sm text-red-600">{mapearErroSupabase(desfazer.error)}</p>}
      </div>
    )
  }

  const resumo = linhas ? resumoLeitura(linhas) : null

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-44">
      <header className="flex items-center gap-2">
        <Link to="/alunos" aria-label="Voltar para os alunos" className="flex size-11 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold">Importar alunos</h1>
      </header>

      {!linhas && (
        <>
          <div role="tablist" aria-label="Como trazer seus alunos" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={via === 'ia'}
              onClick={() => setVia('ia')}
              className={cn('min-h-12 rounded-xl border px-3 text-sm font-semibold', via === 'ia' ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
            >
              Está tudo bagunçado
              <span className={cn('ml-1 block text-xs font-medium', via === 'ia' ? 'text-white/90' : 'text-slate-500')}>com ajuda de uma IA</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={via === 'planilha'}
              onClick={() => setVia('planilha')}
              className={cn('min-h-12 rounded-xl border px-3 text-sm font-semibold', via === 'planilha' ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
            >
              Tenho uma planilha
            </button>
          </div>

          {via === 'ia' && (
            <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Importar com ajuda de uma IA">
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles size={18} className="text-brand-bright" aria-hidden /> Seus alunos estão bagunçados? Use uma IA
              </h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                <li>Toque em <strong>Copiar prompt para IA</strong>.</li>
                <li>Cole o prompt no ChatGPT, Gemini ou Claude e, em seguida, cole ou anexe a sua lista (contatos, caderno, planilha como estiver).</li>
                <li>Copie a resposta da IA e cole abaixo. Você confere tudo antes de gravar.</li>
                <li className="list-none text-xs text-slate-600">Dica: a IA erra mais em lista longa. Mande de 20 a 30 alunos por vez; se passar de {LIMITE_IMPORTACAO}, o app importa os {LIMITE_IMPORTACAO} primeiros e deixa o resto para depois.</li>
              </ol>
              <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                <p>
                  <strong>Cuidado com a privacidade:</strong> ao colar dados de alunos numa IA, você envia dados pessoais a um serviço de terceiros. Mande só nome, telefone, e-mail,
                  nascimento, sexo e objetivos; <strong>nunca</strong> dados de saúde, CPF ou senhas. Prefira o chat temporário ou desligue o uso das conversas para treinar a IA. Você responde por esse
                  envio (Termos de Uso, cláusula 3.5). Confira o resultado: a IA pode errar.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={copiarPrompt}>
                {promptCopiado ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {promptCopiado ? 'Prompt copiado' : 'Copiar prompt para IA'}
              </Button>
              <label className="block text-sm font-medium" htmlFor="texto-colado">
                Cole aqui a resposta da IA
              </label>
              <textarea
                id="texto-colado"
                value={colado}
                onChange={(e) => setColado(e.target.value)}
                rows={5}
                spellCheck={false}
                autoCapitalize="off"
                placeholder="nome;telefone;email;nascimento;sexo;objetivos"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              />
              <Button className="w-full" onClick={conferirColado} disabled={!colado.trim()}>
                Conferir o texto colado
              </Button>
            </section>
          )}

          {via === 'planilha' && (
            <>
              <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                <h2 className="font-semibold">Como funciona</h2>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                  <li>Baixe o modelo e preencha uma linha por aluno. Só o <strong>nome</strong> é obrigatório.</li>
                  <li>Salve como <strong>CSV</strong> (Excel ou Google Planilhas: Salvar como / Fazer download → CSV).</li>
                  <li>Envie o arquivo aqui. Você confere tudo antes de gravar. Até {LIMITE_IMPORTACAO} alunos por vez.</li>
                </ol>
                <Button variant="outline" className="w-full" onClick={baixarModelo}>
                  <Download size={18} /> Baixar modelo (CSV)
                </Button>
                <div className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <p>
                    Entram só <strong>nome, telefone, e-mail, nascimento, sexo e objetivos</strong>. Dados de saúde (lesão, cirurgia, medicamentos e altura) <strong>não</strong> vão pela
                    planilha: só entram com o consentimento do aluno, depois, na ficha. Cobrança e horários também ficam para a ficha.
                  </p>
                </div>
              </section>

              <input ref={entrada} type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={(e) => escolher(e.target.files?.[0])} aria-label="Escolher arquivo CSV" />
              <Button className="w-full" onClick={() => entrada.current?.click()}>
                <FileSpreadsheet size={18} /> Escolher a planilha
              </Button>
            </>
          )}

          {erro && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {erro}
            </p>
          )}
        </>
      )}

      {linhas && resumo && (
        <>
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">{arquivo}</strong>: {resumo.total} {resumo.total === 1 ? 'linha lida' : 'linhas lidas'}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {resumo.ok + resumo.aviso} prontas para importar
              {resumo.duplicado > 0 && ` · ${resumo.duplicado} já existem (fora por padrão)`}
              {resumo.erro > 0 && ` · ${resumo.erro} com erro (ficam de fora)`}
            </p>
            {restantes && (
              <p role="status" className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
                Sua lista tem {resumo.total + restantes.quantidade} alunos. Esta importação traz os {resumo.total} primeiros (limite de {LIMITE_IMPORTACAO} por vez); depois você importa {restantes.quantidade === 1 ? 'o restante' : `os ${restantes.quantidade} restantes`} com um toque.
              </p>
            )}
            {ignoradas.length > 0 && <p className="mt-1 text-xs text-slate-500">Colunas que não usamos e foram ignoradas: {ignoradas.join(', ')}.</p>}
            <button type="button" className="mt-2 min-h-11 text-sm font-medium text-brand-hover underline" onClick={() => setLinhas(null)}>
              Trocar de planilha
            </button>
          </section>

          <ul className="space-y-2">
            {linhas.map((l) => {
              const selecionavel = l.status !== 'erro'
              const marcada = marcadas.has(l.linha)
              return (
                <li key={l.linha} className={cn('rounded-2xl bg-white p-3 shadow-sm', !marcada && 'opacity-60')}>
                  <label className={cn('flex gap-3', selecionavel ? 'cursor-pointer' : 'cursor-default')}>
                    <input
                      type="checkbox"
                      className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
                      checked={marcada}
                      disabled={!selecionavel}
                      onChange={() => alternar(l.linha)}
                      aria-label={`Importar a linha ${l.linha}${l.aluno ? ` (${l.aluno.name})` : ''}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{l.aluno?.name ?? `Linha ${l.linha}`}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', COR[l.status])}>{ROTULO[l.status]}</span>
                      </span>
                      {l.aluno && (
                        <span className="block truncate text-xs text-slate-500">
                          {[l.aluno.phone, l.aluno.email].filter(Boolean).join(' · ') || 'Só o nome'}
                        </span>
                      )}
                      {[...l.erros, ...l.avisos].map((t) => (
                        <span key={t} className="mt-1 flex gap-1 text-xs text-slate-700">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                          {t}
                        </span>
                      ))}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3">
            <div className="mx-auto max-w-2xl">
              <Button className="w-full" onClick={confirmar} disabled={marcadas.size === 0 || importar.isPending}>
                {importar.isPending ? 'Importando…' : `Importar ${marcadas.size} ${marcadas.size === 1 ? 'aluno' : 'alunos'}`}
              </Button>
              {importar.error && <p className="mt-2 text-sm text-red-600">{mapearErroSupabase(importar.error)}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
