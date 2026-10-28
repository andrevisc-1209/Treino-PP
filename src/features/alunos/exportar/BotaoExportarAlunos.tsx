import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { hojeSP } from '@/lib/datas'
import { mapearErroSupabase } from '@/lib/erros'
import { montarCsvAlunos, nomeDoArquivoExportacao, type AlunoParaExportar } from './exportarAlunos'

/** Baixa os alunos (ativos e arquivados; fora da lixeira) em CSV: só dados básicos, no mesmo formato da importação. */
export function BotaoExportarAlunos({ className, discreto = false }: { className?: string; discreto?: boolean }) {
  const [carregando, setCarregando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const baixar = async () => {
    setCarregando(true)
    setAviso(null)
    try {
      const { data, error } = await supabase.from('alunos').select('name, phone, email, birth_date, sex, objetivos, active').is('apagado_em', null).order('name')
      if (error) throw error
      const alunos = (data ?? []) as AlunoParaExportar[]
      if (alunos.length === 0) return setAviso('Você ainda não tem alunos para exportar.')
      // BOM para o Excel abrir com os acentos certos
      const blob = new Blob(['﻿' + montarCsvAlunos(alunos)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeDoArquivoExportacao(hojeSP())
      a.click()
      URL.revokeObjectURL(url)
      setAviso(`${alunos.length} ${alunos.length === 1 ? 'aluno exportado' : 'alunos exportados'}. O arquivo tem só nome, contato, nascimento, sexo e objetivos (nada de saúde).`)
    } catch (e) {
      setAviso(mapearErroSupabase(e))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className={className}>
      {discreto ? (
        <button type="button" onClick={baixar} disabled={carregando} className="block min-h-11 py-2 text-sm font-medium text-brand-hover underline disabled:opacity-60">
          {carregando ? 'Preparando…' : 'Exportar alunos (CSV)'}
        </button>
      ) : (
        <Button variant="outline" className="w-full" onClick={baixar} disabled={carregando}>
          <Download size={18} aria-hidden /> {carregando ? 'Preparando…' : 'Exportar alunos (CSV)'}
        </Button>
      )}
      {aviso && (
        <p role="status" className="mt-2 text-xs text-slate-600">
          {aviso}
        </p>
      )}
    </div>
  )
}
