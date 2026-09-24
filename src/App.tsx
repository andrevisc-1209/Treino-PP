import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AlunosPage } from '@/features/alunos/AlunosPage'
import { AlunoFormPage } from '@/features/alunos/AlunoFormPage'
import { AlunoFichaPage } from '@/features/alunos/AlunoFichaPage'
import { ExerciciosPage } from '@/features/exercicios/ExerciciosPage'
import { PlanoEditorPage } from '@/features/planos/PlanoEditorPage'

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
          <Route path="/exercicios" element={<ExerciciosPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
