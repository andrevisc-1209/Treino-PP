import { useState } from 'react'
import { Check, Copy, Gift, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatarDataCurta } from '@/lib/datas'
import { useMinhasIndicacoes } from './api'
import { ALUNOS_PARA_GANHAR, linkDeIndicacao, linkWhatsappIndicacao, textoSituacaoIndicado } from './indicacao'

/** "Indique e ganhe": o link do personal, o botão do WhatsApp e o placar. Nunca mostra quem foi indicado. */
export function IndicacaoCard() {
  const { data } = useMinhasIndicacoes()
  const [copiado, setCopiado] = useState(false)
  if (!data?.codigo) return null

  const link = linkDeIndicacao(data.codigo)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      window.prompt('Copie o link:', link) // navegador sem permissão de área de transferência
    }
  }
  const situacao = textoSituacaoIndicado(data)

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" aria-label="Indique e ganhe">
      <div className="flex items-start gap-3">
        <Gift size={22} className="mt-0.5 shrink-0 text-brand-bright" aria-hidden />
        <div className="min-w-0">
          <h2 className="font-semibold">Indique um personal: vocês dois ganham 1 mês grátis</h2>
          <p className="text-sm text-slate-600">
            Quando quem você indicou criar a conta e cadastrar {ALUNOS_PARA_GANHAR} alunos, <strong>vocês dois</strong> ganham 1 mês grátis. Você pode ganhar até {data.teto} meses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={linkWhatsappIndicacao(link)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white active:bg-brand-hover"
        >
          <MessageCircle size={18} aria-hidden /> WhatsApp
        </a>
        <Button variant="outline" onClick={copiar}>
          {copiado ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copiado ? 'Copiado' : 'Copiar link'}
        </Button>
      </div>

      <p className="text-sm text-slate-700">
        <strong>{data.concedidas}</strong> {data.concedidas === 1 ? 'indicação concluída' : 'indicações concluídas'} · <strong>{data.pendentes}</strong>{' '}
        {data.pendentes === 1 ? 'em andamento' : 'em andamento'} · <strong>{data.meses_ganhos}</strong> de {data.teto} meses ganhos
      </p>
      {situacao && <p className="rounded-xl bg-brand-soft p-3 text-sm text-brand-hover">{situacao}</p>}
      {data.bonus_ate && new Date(data.bonus_ate).getTime() > Date.now() && (
        <p className="text-xs text-slate-600">Mês grátis garantido até {formatarDataCurta(data.bonus_ate.slice(0, 10))}.</p>
      )}
    </section>
  )
}
