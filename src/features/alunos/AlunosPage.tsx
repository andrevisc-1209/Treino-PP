import { useState } from 'react'
import { LogOut, Plus, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { idade } from '@/lib/utils'
import { Button, Input } from '@/components/ui'
import { useAlunos, useCriarAluno } from './api'

export function AlunosPage() {
  const { data: alunos, isLoading, error } = useAlunos()
  const criar = useCriarAluno()
  const [nome, setNome] = useState('')

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus alunos</h1>
        <Button variant="ghost" onClick={() => supabase.auth.signOut()} aria-label="Sair">
          <LogOut size={20} />
        </Button>
      </header>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (nome.trim()) criar.mutate(nome.trim(), { onSuccess: () => setNome('') })
        }}
      >
        <Input placeholder="Nome do novo aluno" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Button type="submit" disabled={criar.isPending} aria-label="Adicionar aluno">
          <Plus size={20} />
        </Button>
      </form>
      {criar.error && <p className="mb-2 text-sm text-red-600">{(criar.error as Error).message}</p>}

      {isLoading && <p className="text-slate-500">Carregando…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {alunos?.length === 0 && <p className="text-slate-500">Nenhum aluno ainda. Cadastre o primeiro acima.</p>}

      <ul className="space-y-2">
        {alunos?.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100">
              <User size={20} className="text-slate-500" />
            </div>
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-sm text-slate-500">
                {[idade(a.birth_date) != null && `${idade(a.birth_date)} anos`, a.injury && 'lesão'].filter(Boolean).join(' · ') || 'Ficha incompleta'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
