import { useState } from 'react'
import { Copy } from 'lucide-react'
import { ListaSkeleton } from '@/components/Skeleton'
import { Button, Input } from '@/components/ui'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarInfoGlobal } from '@/components/Toast'
import { mapearErroSupabase } from '@/lib/erros'
import { formatarDataBR } from '@/lib/format'
import { linkDeCupom, normalizarCupom } from '@/features/cupom/cupom'
import { useAdminAtualizarCampanhaCupom, useAdminCriarCampanhaCupom, useAdminCupons } from './api'
import { erroDoFormulario, fimDoDiaSP, percentual, ROTULO_PUBLICO, ROTULO_SITUACAO_CAMPANHA, situacaoDaCampanha, type CampanhaCupom, type FormCampanha } from './cupons'

function Cartao({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-accent">{valor}</p>
      {nota && <p className="mt-1 text-xs text-slate-500">{nota}</p>}
    </div>
  )
}

const data = (iso: string | null) => (iso ? formatarDataBR(iso.slice(0, 10)) : '—')
const FORM_VAZIO: FormCampanha = { codigo: '', parceiro: '', dias: '90', validade: '', maxUsos: '50', publico: 'novos' }
const COR_SITUACAO: Record<string, string> = {
  vigente: 'bg-emerald-100 text-emerald-800',
  pausada: 'bg-slate-200 text-slate-800',
  esgotada: 'bg-amber-100 text-amber-900',
  vencida: 'bg-red-100 text-red-800',
  agendada: 'bg-sky-100 text-sky-900',
}

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto)
    mostrarInfoGlobal(aviso)
  } catch {
    mostrarInfoGlobal('Não consegui copiar. Selecione e copie o link manualmente.')
  }
}

/** Cupons de parceiro: cria e pausa campanhas e mostra o funil de cada uma. Só nome de personal e números (nunca dado de aluno). */
export function CuponsSection() {
  const { data: painel, isLoading, error } = useAdminCupons()
  const criar = useAdminCriarCampanhaCupom()
  const atualizar = useAdminAtualizarCampanhaCupom()
  const [form, setForm] = useState<FormCampanha>(FORM_VAZIO)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)

  if (isLoading) return <ListaSkeleton linhas={3} />
  if (error) return <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>
  if (!painel) return null
  const t = painel.totais
  const codigoValido = normalizarCupom(form.codigo)

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    const msg = erroDoFormulario(form)
    setErroForm(msg)
    if (msg) return
    criar.mutate(
      { codigo: codigoValido!, parceiro: form.parceiro.trim(), dias: Number(form.dias), validoAte: fimDoDiaSP(form.validade)!, maxUsos: Number(form.maxUsos), publico: form.publico },
      {
        onSuccess: () => {
          mostrarInfoGlobal(`Campanha ${codigoValido} criada.`)
          setForm(FORM_VAZIO)
          setAberto(false)
        },
        onError: (err) => setErroForm(mapearErroSupabase(err)),
      },
    )
  }

  const alternar = async (c: CampanhaCupom) => {
    const pausar = c.ativa
    const ok = await confirmarAcao({
      titulo: pausar ? 'Pausar campanha' : 'Reativar campanha',
      mensagem: pausar
        ? `O código ${c.codigo} deixa de valer agora (quem já usou mantém os dias). Dá para reativar depois. Fica registrado no histórico de ações.`
        : `O código ${c.codigo} volta a valer, dentro da validade e do limite de usos.`,
      textoConfirmar: pausar ? 'Pausar' : 'Reativar',
      destrutivo: pausar,
    })
    if (!ok) return
    atualizar.mutate(
      { id: c.id, ativa: !pausar },
      { onSuccess: () => mostrarInfoGlobal(pausar ? 'Campanha pausada.' : 'Campanha reativada.'), onError: (err) => mostrarInfoGlobal(mapearErroSupabase(err)) },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-accent">Cupons de parceiro</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Campanhas vigentes" valor={String(t.ativas)} nota={`${t.campanhas} no total`} />
        <Cartao titulo="Cupons usados" valor={String(t.resgates)} nota={`${t.dias_concedidos} dias grátis dados`} />
        <Cartao titulo="Ativaram" valor={String(t.ativados)} nota={`${percentual(t.ativados, t.resgates)}% cadastraram aluno`} />
        <Cartao titulo="Já pagaram" valor={String(t.pagantes)} nota={`${percentual(t.pagantes, t.resgates)}% dos cupons usados`} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {!aberto ? (
          <Button onClick={() => setAberto(true)}>Nova campanha</Button>
        ) : (
          <form onSubmit={enviar} className="space-y-3">
            <h3 className="font-semibold">Nova campanha</h3>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Código (4 a 20 letras e números)</span>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={24} placeholder="PARCEIRO3M" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Parceiro (só você vê)</span>
              <Input value={form.parceiro} onChange={(e) => setForm({ ...form, parceiro: e.target.value })} maxLength={80} autoComplete="off" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Dias grátis (somam ao teste)</span>
                <Input type="number" inputMode="numeric" min={1} max={365} value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Limite de usos</span>
                <Input type="number" inputMode="numeric" min={1} max={100000} value={form.maxUsos} onChange={(e) => setForm({ ...form, maxUsos: e.target.value })} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Vale até (último dia)</span>
              <Input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
            </label>
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium text-slate-700">Quem pode usar</legend>
              {(['novos', 'todos'] as const).map((v) => (
                <label key={v} className="flex min-h-11 items-start gap-3 py-1">
                  <input type="radio" name="publico" className="mt-0.5 size-6 shrink-0 accent-brand" checked={form.publico === v} onChange={() => setForm({ ...form, publico: v })} />
                  <span className="text-sm text-slate-700">
                    <strong>{ROTULO_PUBLICO[v]}</strong>
                    <span className="block text-xs text-slate-500">
                      {v === 'novos' ? 'Conta criada há até 7 dias e ainda sem alunos.' : 'Inclui quem já usa o app ou já paga: os dias somam depois do acesso atual.'}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            {codigoValido && <p className="break-all text-xs text-slate-500">Link do parceiro: {linkDeCupom(codigoValido, form.parceiro)}</p>}
            {erroForm && <p className="text-sm text-red-600">{erroForm}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? 'Criando…' : 'Criar campanha'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setAberto(false); setErroForm(null) }}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">Campanhas</h3>
        {painel.campanhas.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma campanha criada ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {painel.campanhas.map((c) => {
              const sit = situacaoDaCampanha(c)
              const link = linkDeCupom(c.codigo, c.parceiro)
              return (
                <li key={c.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{c.codigo}</strong>
                    <span className="text-sm text-slate-600">{c.parceiro}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_SITUACAO[sit]}`}>{ROTULO_SITUACAO_CAMPANHA[sit]}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {c.dias_bonus} dias · {ROTULO_PUBLICO[c.publico]} · vale até {data(c.valido_ate)} · {c.usos}/{c.max_usos} usos · {c.ativados} ativaram ({percentual(c.ativados, c.usos)}%) · {c.pagantes} pagaram ({percentual(c.pagantes, c.usos)}%)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => copiar(link, 'Link do parceiro copiado.')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-medium active:bg-slate-50">
                      <Copy size={16} aria-hidden /> Copiar link
                    </button>
                    <button type="button" onClick={() => alternar(c)} disabled={atualizar.isPending} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium active:bg-slate-50">
                      {c.ativa ? 'Pausar' : 'Reativar'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold">Usos mais recentes</h3>
        {painel.recentes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum cupom usado ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {painel.recentes.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <strong>{r.personal_nome || '—'}</strong> usou <strong>{r.codigo}</strong>
                <span className="block text-xs text-slate-500">
                  {r.parceiro} · {data(r.resgatado_em)} · {r.dias} dias · {r.ativado ? 'cadastrou aluno' : 'sem aluno ainda'} · {r.pagante ? 'já pagou' : 'ainda não pagou'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-500">O painel mostra nomes de personais e números. Não mostra dados de alunos nem e-mail ou CPF de ninguém. O parceiro não recebe dado de ninguém.</p>
    </div>
  )
}
