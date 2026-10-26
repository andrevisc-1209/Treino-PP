import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BottomSheet, Button } from '@/components/ui'
import { mostrarInfoGlobal } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { dispositivoDoNavegador, RELATO_MAX, TIPOS_RELATO, validarRelato, type TipoRelato } from './relatos'

export function RelatarProblemaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth()
  const [tipo, setTipo] = useState<TipoRelato>('problema')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const enviar = useMutation({
    mutationFn: async (mensagem: string) => {
      const { error } = await supabase.from('relatos').insert({
        professional_id: session?.user.id,
        tipo,
        mensagem,
        dispositivo: dispositivoDoNavegador(navigator.userAgent),
      })
      if (error) throw error
    },
    onSuccess: () => {
      mostrarInfoGlobal('Recebemos seu relato. Obrigado! Se precisarmos, falamos com você pelo WhatsApp ou e-mail.')
      setTexto('')
      setErro(null)
      onClose()
    },
  })

  const submeter = () => {
    const r = validarRelato(texto)
    if (!r.ok) {
      setErro(r.erro)
      return
    }
    setErro(null)
    enviar.mutate(r.mensagem)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Reportar um problema">
      <div className="space-y-3">
        <div className="flex gap-2" role="group" aria-label="Tipo do relato">
          {TIPOS_RELATO.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTipo(t.valor)}
              aria-pressed={tipo === t.valor}
              className={cn(
                'min-h-11 flex-1 rounded-full border px-3 text-sm font-medium',
                tipo === t.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
              )}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="relato-texto" className="mb-1 block text-sm font-medium">
            O que aconteceu?
          </label>
          <textarea
            id="relato-texto"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setErro(null)
            }}
            rows={6}
            maxLength={RELATO_MAX}
            className="w-full rounded-xl border border-slate-300 p-3 text-base"
            placeholder="Em qual tela estava, o que tentou fazer e o que apareceu."
          />
          <p className="mt-1 text-xs text-slate-500">
            Não escreva nome, telefone nem dados de saúde de alunos. Enviamos junto só o tipo de aparelho e navegador.
          </p>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <Button className="w-full" onClick={submeter} disabled={enviar.isPending}>
          {enviar.isPending ? 'Enviando…' : 'Enviar'}
        </Button>
      </div>
    </BottomSheet>
  )
}
