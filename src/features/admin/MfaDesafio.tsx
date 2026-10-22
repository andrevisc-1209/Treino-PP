import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import { codigoMfaValido, mensagemErroMfa, verificarCodigoMfa } from './mfa'

/** Pede o código de 6 dígitos do autenticador antes de abrir o painel admin (sessão ainda só com Google/senha). */
export function MfaDesafio({ factorId, onOk }: { factorId: string; onOk: () => void }) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  const confirmar = async () => {
    setErro(null)
    setVerificando(true)
    try {
      await verificarCodigoMfa(factorId, codigo)
      onOk()
    } catch (e) {
      setErro(mensagemErroMfa(e))
      setCodigo('')
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-brand" size={22} aria-hidden />
          <h1 className="text-xl font-bold">Confirme que é você</h1>
        </div>
        <p className="text-sm text-slate-600">Digite o código de 6 dígitos do seu aplicativo autenticador para abrir o painel.</p>
        <Field label="Código">
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && codigoMfaValido(codigo) && !verificando && confirmar()}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            autoFocus
          />
        </Field>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Button onClick={confirmar} className="w-full" disabled={verificando || !codigoMfaValido(codigo)}>
          {verificando ? 'Confirmando…' : 'Confirmar'}
        </Button>
      </div>
    </div>
  )
}
