import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { mapearErroSupabase } from '@/lib/erros'
import { useMeuCupom, useResgatarCupom } from './api'
import { normalizarCupom, textoDoResultado } from './cupom'

/**
 * "Tenho um cupom" dentro do app (Configurações → Assinatura): para quem não digitou no cadastro. O servidor decide se vale
 * (conta nova, período, limite). Quem já usou um cupom vê só quantos dias ganhou, nunca o parceiro.
 */
export function CupomCampo() {
  const { data: meu } = useMeuCupom()
  const resgatar = useResgatarCupom()
  const [aberto, setAberto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [resposta, setResposta] = useState<{ ok: boolean; texto: string } | null>(null)

  if (meu?.usou) {
    return <p className="text-sm text-slate-600">Cupom aplicado: {meu.dias} dias grátis somados ao seu acesso.</p>
  }
  if (!aberto) {
    return (
      <button type="button" className="min-h-11 text-left text-sm font-medium text-brand-hover underline" onClick={() => setAberto(true)}>
        Tenho um cupom
      </button>
    )
  }
  const valido = normalizarCupom(codigo)
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valido) return
        setResposta(null)
        resgatar.mutate(valido, {
          onSuccess: (r) => setResposta(textoDoResultado(r)),
          onError: (err) => setResposta({ ok: false, texto: mapearErroSupabase(err) }),
        })
      }}
    >
      <label className="block text-sm text-slate-600" htmlFor="cupom-codigo">
        Código do cupom
      </label>
      <div className="flex gap-2">
        <Input
          id="cupom-codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={24}
          placeholder="Ex.: PARCEIRO3M"
        />
        <Button type="submit" disabled={!valido || resgatar.isPending}>
          {resgatar.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {resposta && <p className={resposta.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-600'}>{resposta.texto}</p>}
    </form>
  )
}
