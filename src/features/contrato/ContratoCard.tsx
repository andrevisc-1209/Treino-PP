import { useState } from 'react'
import { FileSignature } from 'lucide-react'
import { BottomSheet, Button, ChipsMultiSelect, Field, Input } from '@/components/ui'
import { ListaSkeleton } from '@/components/Skeleton'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePerfilProfissional } from '@/features/auth/api'
import type { Aluno } from '@/features/alunos/api'
import { useAlunoCobranca } from '@/features/financeiro/api'
import { usePacotesAtivos } from '@/features/pacotes/api'
import { mascararCPF, validarCPF } from '@/lib/cpf'
import { hojeSP } from '@/lib/datas'
import { mapearErroSupabase } from '@/lib/erros'
import { cn } from '@/lib/utils'
import { useGuardarDadosDoContrato } from './api'
import { avisosDoContrato, ehMenorDeIdade, FORMAS_CONTRATO, LIMITE_MULTA, MODALIDADES_CONTRATO, problemasDoContrato, type FormaContrato, type RegrasContrato } from './contrato'
import { CHAVE_REGRAS, dadosDoFormulario, formularioInicial, lerRegrasSalvas, mudouNoCadastro, type FormContrato } from './formulario'
import { baixarContrato } from './pdf'

const campo = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm'

function Opcao({ ligado, onChange, children }: { ligado: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-800">
      <input type="checkbox" checked={ligado} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[#367c39]" />
      <span>{children}</span>
    </label>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-slate-600">{titulo}</h3>
      {children}
    </section>
  )
}

function NumeroCampo({ rotulo, valor, onChange, sufixo, largura = 'w-28' }: { rotulo: string; valor: string; onChange: (v: string) => void; sufixo?: string; largura?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {rotulo}
      <span className="flex items-center gap-2">
        <input inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} className={cn(campo, largura)} />
        {sufixo && <span className="text-slate-600">{sufixo}</span>}
      </span>
    </label>
  )
}

function Formulario({ aluno, inicial, userId, contexto, onFechar }: { aluno: Aluno; inicial: FormContrato; userId: string; contexto: Parameters<typeof dadosDoFormulario>[1]; onFechar: () => void }) {
  const [f, setF] = useState<FormContrato>(inicial)
  const [erros, setErros] = useState<string[]>([])
  const [gerando, setGerando] = useState(false)
  const guardar = useGuardarDadosDoContrato(aluno.id)
  const mudar = <K extends keyof FormContrato>(k: K, v: FormContrato[K]) => setF((x) => ({ ...x, [k]: v }))
  const regra = <K extends keyof RegrasContrato>(k: K, v: RegrasContrato[K]) => setF((x) => ({ ...x, regras: { ...x.regras, [k]: v } }))
  const r = f.regras

  const dados = dadosDoFormulario(f, contexto)
  const avisos = avisosDoContrato(dados)
  const cpfAlunoRuim = f.cpf.replace(/\D/g, '').length > 0 && !validarCPF(f.cpf)
  const cpfRespRuim = f.menor && f.respCpf.replace(/\D/g, '').length > 0 && !validarCPF(f.respCpf)

  const baixar = async () => {
    const problemas = problemasDoContrato(dados)
    if (cpfAlunoRuim) problemas.push('O CPF do aluno é inválido.')
    if (cpfRespRuim) problemas.push('O CPF do responsável é inválido.')
    setErros(problemas)
    if (problemas.length > 0) return
    setGerando(true)
    try {
      if (f.salvarNoCadastro && mudouNoCadastro(f, { cpf: aluno.cpf, endereco: aluno.endereco })) {
        await guardar.mutateAsync({ ...(dados.aluno.cpf ? { cpf: dados.aluno.cpf } : {}), ...(dados.aluno.endereco ? { endereco: dados.aluno.endereco } : {}) })
      }
      await baixarContrato(dados)
      try {
        localStorage.setItem(CHAVE_REGRAS(userId), JSON.stringify(f.regras))
      } catch {
        /* sem armazenamento local: só não lembra as regras da próxima vez */
      }
      mostrarInfoGlobal('Contrato baixado. Imprima, assine e colha a assinatura do aluno.')
      onFechar()
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Modelo-padrão em PDF, já com os dados do cadastro. Você assina e colhe a assinatura do aluno: nada é enviado nem guardado além do CPF e do endereço do aluno, se você deixar.</p>

      <Secao titulo="Aluno">
        <Field label="CPF do aluno">
          <Input inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={(e) => mudar('cpf', mascararCPF(e.target.value))} />
        </Field>
        <Field label="Endereço do aluno">
          <Input value={f.endereco} maxLength={200} onChange={(e) => mudar('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade/UF" />
        </Field>
        {mudouNoCadastro(f, { cpf: aluno.cpf, endereco: aluno.endereco }) && (
          <Opcao ligado={f.salvarNoCadastro} onChange={(v) => mudar('salvarNoCadastro', v)}>
            Guardar o CPF e o endereço no cadastro do aluno
          </Opcao>
        )}
        <Opcao ligado={f.menor} onChange={(v) => mudar('menor', v)}>
          O aluno é menor de 18 anos (assina o responsável legal)
        </Opcao>
        {f.menor && (
          <>
            <Field label="Nome do responsável legal">
              <Input value={f.respNome} onChange={(e) => mudar('respNome', e.target.value)} />
            </Field>
            <Field label="CPF do responsável legal">
              <Input inputMode="numeric" placeholder="000.000.000-00" value={f.respCpf} onChange={(e) => mudar('respCpf', mascararCPF(e.target.value))} />
            </Field>
            <p className="text-xs text-slate-600">Os dados do responsável entram só no PDF; não são guardados.</p>
          </>
        )}
      </Secao>

      <Secao titulo="Serviço">
        <Field label="Modalidades">
          <ChipsMultiSelect options={MODALIDADES_CONTRATO} value={f.modalidades} onChange={(v) => mudar('modalidades', v)} />
        </Field>
        <Field label="Local das aulas">
          <Input value={f.local} onChange={(e) => mudar('local', e.target.value)} placeholder="Ex.: Academia Central, Rua X, 100" />
        </Field>
        <Field label="Dias e horários (opcional)">
          <Input value={f.diasHorarios} onChange={(e) => mudar('diasHorarios', e.target.value)} placeholder="Ex.: segundas e quartas, às 7h" />
        </Field>
        <Field label="Início do contrato">
          <Input type="date" value={f.inicio} onChange={(e) => mudar('inicio', e.target.value)} />
        </Field>
      </Secao>

      <Secao titulo="Valor e pagamento">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Forma de cobrança">
          {FORMAS_CONTRATO.map((o) => (
            <button
              key={o.valor}
              type="button"
              aria-pressed={f.forma === o.valor}
              onClick={() => mudar('forma', o.valor as FormaContrato)}
              className={cn('min-h-11 rounded-full border px-4 text-sm font-medium', f.forma === o.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {f.forma === 'por_aula' && <NumeroCampo rotulo="Valor da aula (R$)" valor={f.valorAula} onChange={(v) => mudar('valorAula', v)} />}
          {f.forma === 'mensal' && <NumeroCampo rotulo="Mensalidade (R$)" valor={f.valorMensal} onChange={(v) => mudar('valorMensal', v)} />}
          {f.forma === 'pacote' && (
            <>
              <NumeroCampo rotulo="Aulas do pacote" valor={f.qtdAulas} onChange={(v) => mudar('qtdAulas', v)} largura="w-24" />
              <NumeroCampo rotulo="Valor do pacote (R$)" valor={f.valorPacote} onChange={(v) => mudar('valorPacote', v)} />
              <NumeroCampo rotulo="Validade" valor={f.validadeDias} onChange={(v) => mudar('validadeDias', v)} sufixo="dias" largura="w-24" />
            </>
          )}
          <NumeroCampo rotulo="Dia do vencimento (opcional)" valor={f.vencimentoDia} onChange={(v) => mudar('vencimentoDia', v)} largura="w-24" />
        </div>
        <Opcao ligado={r.multaAtiva} onChange={(v) => regra('multaAtiva', v)}>
          Multa e juros em caso de atraso
        </Opcao>
        {r.multaAtiva && (
          <div className="flex flex-wrap gap-3">
            <NumeroCampo rotulo="Multa" valor={String(r.multaPct).replace('.', ',')} onChange={(v) => regra('multaPct', Math.max(0, Number(v.replace(',', '.')) || 0))} sufixo="%" largura="w-24" />
            <NumeroCampo rotulo="Juros ao mês" valor={String(r.jurosPct).replace('.', ',')} onChange={(v) => regra('jurosPct', Math.max(0, Number(v.replace(',', '.')) || 0))} sufixo="%" largura="w-24" />
          </div>
        )}
        {r.multaAtiva && r.multaPct > LIMITE_MULTA && <p className="text-xs text-amber-800">A multa passa de 2%, o limite do Código de Defesa do Consumidor.</p>}
      </Secao>

      <Secao titulo="Regras das aulas">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Aviso mínimo para cancelar
          <select value={r.antecedenciaHoras} onChange={(e) => regra('antecedenciaHoras', Number(e.target.value))} className={campo}>
            {[...new Set([2, 6, 12, 24, 48, 72, r.antecedenciaHoras])]
              .sort((a, b) => a - b)
              .map((h) => (
                <option key={h} value={h}>
                  {h} horas
                </option>
              ))}
          </select>
        </label>
        <Opcao ligado={r.faltaCobrada} onChange={(v) => regra('faltaCobrada', v)}>
          Falta sem aviso é cobrada e não é reposta
        </Opcao>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Reposição de aulas avisadas
          <select value={r.reposicao} onChange={(e) => regra('reposicao', e.target.value as RegrasContrato['reposicao'])} className={campo}>
            <option value="mesmo_mes">No mesmo mês, senão se perde</option>
            <option value="prazo">Em um prazo em dias</option>
            <option value="nenhuma">Não há reposição</option>
          </select>
        </label>
        {r.reposicao === 'prazo' && <NumeroCampo rotulo="Prazo para repor" valor={String(r.reposicaoDias)} onChange={(v) => regra('reposicaoDias', Math.max(1, Math.trunc(Number(v) || 1)))} sufixo="dias" largura="w-24" />}
        <Opcao ligado={r.marcacaoPrevia} onChange={(v) => regra('marcacaoPrevia', v)}>
          Todo treino precisa ser agendado antes
        </Opcao>
        <Opcao ligado={r.horariosConformeAgenda} onChange={(v) => regra('horariosConformeAgenda', v)}>
          Horários combinados conforme a minha agenda
        </Opcao>
        <Opcao ligado={r.perdaDoHorario} onChange={(v) => regra('perdaDoHorario', v)}>
          Faltas seguidas podem fazer o aluno perder o horário
        </Opcao>
        <Opcao ligado={r.reajuste} onChange={(v) => regra('reajuste', v)}>
          Valor pode ser reajustado (frequência, deslocamento e custos)
        </Opcao>
        {r.reajuste && <NumeroCampo rotulo="Aviso prévio do reajuste" valor={String(r.reajusteAvisoDias)} onChange={(v) => regra('reajusteAvisoDias', Math.max(1, Math.trunc(Number(v) || 1)))} sufixo="dias" largura="w-24" />}
        {f.forma === 'mensal' && (
          <>
            <Opcao ligado={r.trancamento} onChange={(v) => regra('trancamento', v)}>
              Trancamento ou saída com aviso prévio e taxa
            </Opcao>
            {r.trancamento && (
              <div className="flex flex-wrap gap-3">
                <NumeroCampo rotulo="Aviso prévio" valor={String(r.trancamentoAvisoDias)} onChange={(v) => regra('trancamentoAvisoDias', Math.max(1, Math.trunc(Number(v) || 1)))} sufixo="dias" largura="w-24" />
                <NumeroCampo rotulo="Taxa se avisar fora do prazo" valor={String(r.trancamentoTaxaPct).replace('.', ',')} onChange={(v) => regra('trancamentoTaxaPct', Math.max(0, Number(v.replace(',', '.')) || 0))} sufixo="% da mensalidade" largura="w-24" />
              </div>
            )}
          </>
        )}
      </Secao>

      {avisos.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      {erros.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {erros.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-600">Este é um modelo-padrão: recomenda-se revisão de um advogado antes de usar. O contrato não leva dado de saúde.</p>
      <Button onClick={baixar} disabled={gerando} className="w-full">
        {gerando ? 'Gerando…' : 'Baixar contrato em PDF'}
      </Button>
    </div>
  )
}

function Folha({ aluno, onFechar }: { aluno: Aluno; onFechar: () => void }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const perfil = usePerfilProfissional(userId)
  const cobranca = useAlunoCobranca(aluno.id)
  const pacotes = usePacotesAtivos()

  if (!userId || perfil.isLoading || cobranca.isLoading || pacotes.isLoading) return <ListaSkeleton linhas={3} />
  if (perfil.error || cobranca.error || pacotes.error) return <p className="py-4 text-sm text-red-600">{mapearErroSupabase(perfil.error ?? cobranca.error ?? pacotes.error)}</p>

  const hoje = hojeSP()
  const pacote = pacotes.data?.get(aluno.id)?.pacote ?? null
  let guardado: Storage | null = null
  try {
    guardado = localStorage
  } catch {
    guardado = null
  }
  const inicial = formularioInicial({
    aluno: { cpf: aluno.cpf, endereco: aluno.endereco, birth_date: aluno.birth_date },
    cobranca: cobranca.data && cobranca.data.ativo ? { modelo: cobranca.data.modelo, valor_aula: cobranca.data.valor_aula, valor_mensal: cobranca.data.valor_mensal } : null,
    pacote: pacote ? { qtd_aulas: pacote.qtd_aulas, valor: pacote.valor, validade_dias: pacote.validade_dias, inicio: pacote.inicio } : null,
    hoje,
    menor: ehMenorDeIdade(aluno.birth_date, hoje),
    regrasSalvas: lerRegrasSalvas(guardado, userId),
  })
  return (
    <Formulario
      aluno={aluno}
      inicial={inicial}
      userId={userId}
      onFechar={onFechar}
      contexto={{
        personal: { nome: perfil.data?.name?.trim() ?? '', cpf: perfil.data?.cpf ?? null, cidade: perfil.data?.cidade ?? null, uf: perfil.data?.uf ?? null },
        aluno: { nome: aluno.name, telefone: aluno.phone, email: aluno.email },
        hoje,
      }}
    />
  )
}

/** Cartão "Contrato" da ficha do aluno: abre o formulário e baixa a minuta em PDF, já preenchida. */
export function ContratoCard({ aluno }: { aluno: Aluno }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <FileSignature size={18} /> Contrato
      </h2>
      <p className="text-sm text-slate-600">Minuta de contrato de prestação de serviço em PDF, já preenchida com os dados do aluno e da cobrança.</p>
      <Button variant="outline" onClick={() => setAberto(true)} className="w-full">
        Gerar contrato
      </Button>
      <BottomSheet open={aberto} onClose={() => setAberto(false)} title={`Contrato — ${aluno.name}`}>
        {aberto && <Folha aluno={aluno} onFechar={() => setAberto(false)} />}
      </BottomSheet>
    </div>
  )
}
