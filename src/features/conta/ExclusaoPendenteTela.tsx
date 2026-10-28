import { LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { mapearErroSupabase } from '@/lib/erros'
import { dataDaExclusao, type ExclusaoPendente } from './exclusao'
import { useCancelarExclusao } from './api'

/** Tela única de uma conta com a exclusão pedida: mostra o protocolo, a data e deixa CANCELAR ou sair. Nada mais do app abre. */
export function ExclusaoPendenteTela({ exclusao }: { exclusao: ExclusaoPendente }) {
  const cancelar = useCancelarExclusao()
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-900">
          <ShieldAlert size={26} aria-hidden />
        </div>
        <h1 className="text-center text-xl font-bold">Sua conta está em exclusão</h1>
        <p className="mt-3 text-sm text-slate-700">
          Seus dados serão apagados de vez em <strong>{dataDaExclusao(exclusao.prevista_em)}</strong>. Até lá o acesso ao app fica bloqueado e você pode mudar de ideia.
        </p>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          Protocolo: <strong className="select-all">{exclusao.protocolo}</strong>
        </p>
      </div>
      <Button className="w-full" onClick={() => cancelar.mutate()} disabled={cancelar.isPending}>
        {cancelar.isPending ? 'Cancelando…' : 'Cancelar a exclusão e voltar ao app'}
      </Button>
      {cancelar.error && <p role="alert" className="text-sm text-red-600">{mapearErroSupabase(cancelar.error)}</p>}
      <Button variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>
        <LogOut size={18} /> Sair
      </Button>
    </div>
  )
}
