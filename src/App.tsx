import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AlunosPage } from '@/features/alunos/AlunosPage'
import { AlunoFormPage } from '@/features/alunos/AlunoFormPage'
import { AlunoFichaPage } from '@/features/alunos/AlunoFichaPage'
import { ExerciciosPage } from '@/features/exercicios/ExerciciosPage'
import { PlanoEditorPage } from '@/features/planos/PlanoEditorPage'
import { NovaSessaoPage } from '@/features/sessoes/NovaSessaoPage'
import { SessaoPage } from '@/features/sessoes/SessaoPage'
import { FinalizarSessaoPage } from '@/features/sessoes/FinalizarSessaoPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<AlunosPage />} />
          <Route path="/alunos/novo" element={<AlunoFormPage mode="create" />} />
          <Route path="/alunos/:id" element={<AlunoFichaPage />} />
          <Route path="/alunos/:id/editar" element={<AlunoFormPage mode="edit" />} />
          <Route path="/alunos/:id/planos/:planoId" element={<PlanoEditorPage />} />
          <Route path="/alunos/:id/sessoes/nova" element={<NovaSessaoPage />} />
          <Route path="/alunos/:id/sessoes/:sessionId" element={<SessaoPage />} />
          <Route path="/alunos/:id/sessoes/:sessionId/finalizar" element={<FinalizarSessaoPage />} />
          <Route path="/exercicios" element={<ExerciciosPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
