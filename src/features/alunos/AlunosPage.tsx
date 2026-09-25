import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, desambiguarPorNome, idade } from '@/lib/utils'
import { Button, Input } from '@/components/ui'
import { InstallBanner } from '@/components/InstallBanner'
import { Avatar } from '@/components/Avatar'
import { mapearErroSupabase } from '@/lib/erros'
import { ListaSkeleton } from '@/components/Skeleton'
import { useAlunosComCobranca } from '@/features/financeiro/api'
import { useAlunos } from './api'

export function AlunosPage() {
  const { data: alunos, isLoading, error } = useAlunos()
  const { data: alunosComCobranca } = useAlunosComCobranca()
  const [busca, setBusca] = useState('')

  const idsComCobranca = new Set((alunosComCobranca ?? []).map((c) => c.aluno_id))

  const filtrados = alunos?.filter((a) => a.name.toLowerCase().includes(busca.trim().toLowerCase()))
  const desambiguar = desambiguarPorNome(alunos ?? [])

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus alunos</h1>
        <Button variant="ghost" onClick={() => supabase.auth.signOut()} aria-label="Sair">
          <LogOut size={20} />
        </Button>
      </header>

      <InstallBanner />

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar aluno por nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link
          to="/alunos/novo"
          aria-label="Novo aluno"
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-medium text-white transition active:bg-brand-dark',
          )}
        >
          <Plus size={20} />
        </Link>
      </div>

      {isLoading && <ListaSkeleton />}
      {error && <p className="text-red-600">{mapearErroSupabase(error)}</p>}
      {alunos?.length === 0 && <p className="text-slate-500">Nenhum aluno ainda. Cadastre o primeiro acima.</p>}
      {alunos && alunos.length > 0 && filtrados?.length === 0 && (
        <p className="text-slate-500">Nenhum aluno encontrado para "{busca}".</p>
      )}

      <ul className="space-y-2">
        {filtrados?.map((a) => (
          <li key={a.id}>
            <Link
              to={`/alunos/${a.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition active:bg-slate-50"
            >
              <Avatar id={a.id} nome={a.name} />
              <div className="min-w-0">
                <p className="font-medium">
                  {a.name}
                  {desambiguar(a) && <span className="ml-1 font-normal text-slate-400">· {desambiguar(a)}</span>}
                </p>
                <p className="text-sm text-slate-500">
                  {[idade(a.birth_date) != null && `${idade(a.birth_date)} anos`, a.injury && 'lesão'].filter(Boolean).join(' · ') ||
                    'Ficha incompleta'}
                  {!idsComCobranca.has(a.id) && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Sem valor definido</span>
                  )}
                </p>
                {a.objetivos[0] && <p className="truncate text-xs text-slate-400">{a.objetivos[0]}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
