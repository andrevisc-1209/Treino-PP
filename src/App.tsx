import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DefinirSenhaPage } from '@/features/auth/DefinirSenhaPage'
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage'
import { AlunosPage } from '@/features/alunos/AlunosPage'
import { AlunoFormPage } from '@/features/alunos/AlunoFormPage'
import { AlunoFichaPage } from '@/features/alunos/AlunoFichaPage'
import { TermoPage } from '@/features/alunos/TermoPage'
import { TermosPage } from '@/features/legal/TermosPage'
import { PrivacidadePage } from '@/features/legal/PrivacidadePage'
import { ExerciciosPage } from '@/features/exercicios/ExerciciosPage'
import { ModelosPage } from '@/features/modelos/ModelosPage'
import { ModeloEditorPage } from '@/features/modelos/ModeloEditorPage'
import { PlanoEditorPage } from '@/features/planos/PlanoEditorPage'
import { ConsentimentoSaudePage } from '@/features/alunos/ConsentimentoSaudePage'
import { ConsentimentosPage } from '@/features/consentimentos/ConsentimentosPage'
import { RetornoCheckoutPage } from '@/features/assinatura/RetornoCheckoutPage'
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
import { AdminPage } from '@/features/admin/AdminPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/definir-senha" element={<DefinirSenhaPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/termo" element={<TermoPage />} />
        <Route path="/termos" element={<TermosPage />} />
        <Route path="/privacidade" element={<PrivacidadePage />} />
        {/* Fora do RequireAuth de propósito: o admin não é um "personal" (sem
            trial/assinatura, sem bottom nav de agenda/alunos). A própria
            AdminPage faz o guard de sessão + is_admin. */}
        <Route path="/consentimento/saude" element={<ConsentimentoSaudePage />} />
        <Route path="/checkout/success" element={<RetornoCheckoutPage resultado="success" />} />
        <Route path="/checkout/failure" element={<RetornoCheckoutPage resultado="failure" />} />
        <Route path="/checkout/pending" element={<RetornoCheckoutPage resultado="pending" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HojePage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/consentimentos" element={<ConsentimentosPage />} />
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
          <Route path="/meus-treinos" element={<Navigate to="/meus-treinos/planejados" replace />} />
          <Route path="/meus-treinos/exercicios" element={<ExerciciosPage />} />
          <Route path="/meus-treinos/planejados" element={<ModelosPage />} />
          <Route path="/meus-treinos/planejados/:modeloId" element={<ModeloEditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaUpdatePrompt />
    </>
  )
}
