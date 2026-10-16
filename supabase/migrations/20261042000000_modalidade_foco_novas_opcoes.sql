-- ============================================================
-- Migration: 20261042000000_modalidade_foco_novas_opcoes.sql
--
-- "Objetivo esportivo › Modalidade foco" ganha opções: futebol, futevôlei, trilha/caminhada,
-- vôlei e outros. A coluna é TEXT com CHECK (não é enum): troca o CHECK pela lista nova.
-- (Aceita os valores antigos; nenhum dado existente é alterado.)
-- ============================================================

BEGIN;

-- Remove o CHECK antigo seja qual for o nome gerado.
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'treino.alunos'::regclass AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%modalidade_foco%'
  LOOP
    EXECUTE format('ALTER TABLE treino.alunos DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE treino.alunos
  ADD CONSTRAINT alunos_modalidade_foco_check
  CHECK (modalidade_foco IN ('ciclismo', 'corrida', 'futebol', 'futevolei', 'natacao', 'triathlon', 'trilha_caminhada', 'volei', 'outros'));

COMMIT;
