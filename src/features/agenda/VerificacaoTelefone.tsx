import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CircleAlert } from 'lucide-react'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { mostrarInfoGlobal } from '@/components/Toast'
import { mascararTelefone } from '@/lib/telefone'
import { confirmarCodigoTelefone, solicitarCodigoTelefone } from '@/features/auth/verificacaoTelefone'
import { mapearErroSupabase } from '@/lib/erros'

/** Selo "Verificado ✓" / "Não verificado" do telefone. */
export function SeloTelefone({ verificado }: { verificado: boolean }) {
  return verificado ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <BadgeCheck size={14} aria-hidden /> Verificado ✓
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
      <CircleAlert size={14} aria-hidden /> Não verificado
    </span>
  )
}

/**
 * Prova de posse do telefone: manda um código por WhatsApp para o número salvo no perfil e confere. Sem isso a plataforma não
 * envia notificações (o telefone é digitado pelo próprio usuário; sem a prova, daria para cadastrar o número de outra pessoa).
 */
export function VerificacaoTelefone({ userId, telefone, verificado, salvo }: { userId: string; telefone: string; verificado: boolean; salvo: boolean }) {
  const qc = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const [etapa, setEtapa] = useState<'enviar' | 'codigo'>('enviar')
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const fechar = () => {
    setAberto(false)
    setEtapa('enviar')
    setCodigo('')
    setErro(null)
  }

  const enviar = async () => {
    setErro(null)
    setCarregando(true)
    try {
      await solicitarCodigoTelefone(telefone)
      setEtapa('codigo')
      setCodigo('')
    } catch (e) {
      setErro(mapearErroSupabase(e))
    } finally {
      setCarregando(false)
    }
  }

  const confirmar = async () => {
    setErro(null)
    setCarregando(true)
    try {
      await confirmarCodigoTelefone(codigo)
      await qc.invalidateQueries({ queryKey: ['telefone-verificado', userId] })
      mostrarInfoGlobal('Telefone verificado ✓')
      fechar()
    } catch (e) {
      setErro(mapearErroSupabase(e))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <SeloTelefone verificado={verificado} />
        {!verificado && (
          <Button variant="outline" className="shrink-0" disabled={!salvo || !telefone} onClick={() => setAberto(true)}>
            Verificar
          </Button>
        )}
      </div>
      {!verificado && !salvo && <p className="text-xs text-slate-500">Salve o telefone antes de verificar.</p>}
      {!verificado && salvo && <p className="text-xs text-slate-500">Sem a verificação você não recebe notificações por WhatsApp.</p>}

      <BottomSheet open={aberto} onClose={fechar} title="Verificar telefone" mostrarFechar>
        <div className="space-y-4">
          {etapa === 'enviar' ? (
            <>
              <p className="text-sm text-slate-600">
                Vamos enviar um código de 6 dígitos por WhatsApp para <span className="font-medium text-slate-800">{mascararTelefone(telefone)}</span>.
              </p>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button className="w-full" onClick={enviar} disabled={carregando}>
                {carregando ? 'Enviando…' : 'Enviar código'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">Digite o código que chegou no seu WhatsApp. Ele vale por 10 minutos.</p>
              <Field label="Código">
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                />
              </Field>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button className="w-full" onClick={confirmar} disabled={carregando || codigo.length !== 6}>
                {carregando ? 'Confirmando…' : 'Confirmar'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={enviar} disabled={carregando}>
                Reenviar código
              </Button>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
