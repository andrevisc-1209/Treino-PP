import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { useSalvarProfessionalConfig } from './api'
import { fotoValida, prepararFoto } from './fotoPerfil'

/** Foto opcional que aparece no topo da página pública. Reduzida no aparelho (256 x 256) antes de enviar; salva na hora. */
export function FotoDoPerfil({ foto, nome }: { foto: string | null | undefined; nome: string }) {
  const { exigir } = useExigirAssinatura()
  const salvar = useSalvarProfessionalConfig()
  const entrada = useRef<HTMLInputElement>(null)
  const [preparando, setPreparando] = useState(false)
  const atual = fotoValida(foto)

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setPreparando(true)
    try {
      const r = await prepararFoto(arquivo)
      if (!r.ok) return mostrarErroGlobal(r.erro)
      await salvar.mutateAsync({ pagina_foto: r.foto })
      mostrarInfoGlobal('Foto salva. Ela já aparece na sua página pública.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    } finally {
      setPreparando(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  const remover = async () => {
    if (!(await confirmarAcao({ titulo: 'Remover a foto?', mensagem: 'A página pública volta a mostrar a inicial do seu nome.', textoConfirmar: 'Remover', destrutivo: true }))) return
    try {
      await salvar.mutateAsync({ pagina_foto: null })
      mostrarInfoGlobal('Foto removida.')
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
    }
  }

  const ocupado = preparando || salvar.isPending
  return (
    <div className="flex items-center gap-3">
      {atual ? (
        <img src={atual} alt={`Sua foto na página pública`} width={64} height={64} className="size-16 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-600" aria-hidden>
          {nome.trim().charAt(0).toUpperCase() || <Camera size={24} />}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <input ref={entrada} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void escolher(e.target.files?.[0])} />
        <button
          type="button"
          disabled={ocupado}
          onClick={exigir(() => entrada.current?.click())}
          className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 active:bg-slate-50 disabled:opacity-60"
        >
          <Camera size={16} aria-hidden /> {ocupado ? 'Preparando…' : atual ? 'Trocar foto' : 'Escolher foto'}
        </button>
        {atual && !ocupado && (
          <button type="button" onClick={exigir(() => void remover())} className="flex min-h-11 items-center text-sm font-medium text-red-700 underline">
            Remover foto
          </button>
        )}
      </div>
    </div>
  )
}
