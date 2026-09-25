import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DefinirSenhaPage } from '@/features/auth/DefinirSenhaPage'
import { AlunosPage } from '@/features/alunos/AlunosPage'
import { AlunoFormPage } from '@/features/alunos/AlunoFormPage'
import { AlunoFichaPage } from '@/features/alunos/AlunoFichaPage'
import { TermoPage } from '@/features/alunos/TermoPage'
import { ExerciciosPage } from '@/features/exercicios/ExerciciosPage'
import { ModelosPage } from '@/features/modelos/ModelosPage'
import { ModeloEditorPage } from '@/features/modelos/ModeloEditorPage'
import { PlanoEditorPage } from '@/features/planos/PlanoEditorPage'
import { NovaSessaoPage } from '@/features/sessoes/NovaSessaoPage'
import { SessaoPage } from '@/features/sessoes/SessaoPage'
import { FinalizarSessaoPage } from '@/features/sessoes/FinalizarSessaoPage'
import { HojePage } from '@/features/agenda/HojePage'
import { AgendaPage } from '@/features/agenda/AgendaPage'
import { ConfiguracoesPage } from '@/features/agenda/ConfiguracoesPage'
import { FinanceiroPage } from '@/features/financeiro/FinanceiroPage'
import { FecharCicloPage } from '@/features/financeiro/FecharCicloPage'
import { FaturaPage } from '@/features/financeiro/FaturaPage'
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/definir-senha" element={<DefinirSenhaPage />} />
        <Route path="/termo" element={<TermoPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HojePage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/alunos" element={<AlunosPage />} />
          <Route path="/alunos/novo" element={<AlunoFormPage mode="create" />} />
          <Route path="/alunos/:id" element={<AlunoFichaPage />} />
          <Route path="/alunos/:id/editar" element={<AlunoFormPage mode="edit" />} />
          <Route path="/alunos/:id/planos/:planoId" element={<PlanoEditorPage />} />
          <Route path="/alunos/:id/sessoes/nova" element={<NovaSessaoPage />} />
          <Route path="/alunos/:id/sessoes/:sessionId" element={<SessaoPage />} />
          <Route path="/alunos/:id/sessoes/:sessionId/finalizar" element={<FinalizarSessaoPage />} />
          <Route path="/alunos/:id/fechar-ciclo" element={<FecharCicloPage />} />
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/financeiro/:faturaId" element={<FaturaPage />} />
          <Route path="/exercicios" element={<ExerciciosPage />} />
          <Route path="/modelos" element={<ModelosPage />} />
          <Route path="/modelos/:modeloId" element={<ModeloEditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaUpdatePrompt />
    </>
  )
}
