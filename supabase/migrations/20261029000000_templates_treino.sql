-- ============================================================
-- Migration: 20261029000000_templates_treino.sql
--
-- Modelos prontos "do sistema" para corrida, ciclismo e brick, mostrados
-- na hora de criar um treino (como já acontece na natação). Ficam numa
-- tabela própria, global e somente leitura — separada de treino.modelos
-- (os "Treinos planejados" do personal), então nunca poluem a lista dele.
--
-- modalidade_detalhes segue o mesmo formato que o app salva em
-- treino.planos / treino.modelos, então aplicar um modelo é só carregar
-- o JSON no formulário da modalidade.
-- Idempotente: IF NOT EXISTS + ON CONFLICT (slug) DO NOTHING.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS treino.templates_treino (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  modalidade          treino.modalidade_tipo NOT NULL,
  nome                TEXT NOT NULL,
  descricao           TEXT NULL,
  tipo_execucao       TEXT NOT NULL DEFAULT 'sincrono' CHECK (tipo_execucao IN ('sincrono', 'assincrono')),
  modalidade_detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem               INT NOT NULL DEFAULT 0,
  ativo               BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_treino_modalidade ON treino.templates_treino (modalidade, ordem);

ALTER TABLE treino.templates_treino ENABLE ROW LEVEL SECURITY;

-- Catálogo global: qualquer personal logado lê; ninguém escreve pela API
-- (só migration / service_role). Sem professional_id, então não há
-- isolamento por personal a fazer aqui.
DROP POLICY IF EXISTS templates_treino_leitura ON treino.templates_treino;
CREATE POLICY templates_treino_leitura ON treino.templates_treino
  FOR SELECT TO authenticated
  USING (ativo);

REVOKE ALL ON treino.templates_treino FROM PUBLIC, anon, authenticated;
GRANT SELECT ON treino.templates_treino TO authenticated;
GRANT ALL ON treino.templates_treino TO service_role;

INSERT INTO treino.templates_treino (slug, modalidade, nome, descricao, modalidade_detalhes, ordem) VALUES
-- ----- Corrida -----
('corrida-leve-30', 'corrida', 'Corrida leve 30 min',
 'Ritmo confortável, em que dá para conversar. Bom para base e recuperação.',
 $json${"blocos":[{"tipo":"regenerativo","nome":"Regenerativo","tempo":30,"zona_fc":2,"observacao":"Ritmo confortável"}]}$json$::jsonb, 10),
('corrida-intervalado-5x400', 'corrida', 'Intervalado 5 × 400 m',
 'Aquecimento de 10 min, 5 tiros de 400 m com 90 s de recuperação e 10 min de desaquecimento.',
 $json${"blocos":[
   {"tipo":"aerobico-base","nome":"Aquecimento","tempo":10,"zona_fc":2},
   {"tipo":"intervalado-curto","nome":"Tiros de 400 m","series":5,"distancia_serie":400,"descanso":90},
   {"tipo":"regenerativo","nome":"Desaquecimento","tempo":10,"zona_fc":1}]}$json$::jsonb, 20),
('corrida-long-run-60', 'corrida', 'Long run 60 min',
 'Corrida contínua em ritmo fácil, para construir resistência.',
 $json${"blocos":[{"tipo":"long-run","nome":"Long Run","tempo":60,"zona_fc":2,"observacao":"Ritmo fácil, contínuo"}]}$json$::jsonb, 30),
-- ----- Ciclismo -----
('ciclismo-pedal-base-45', 'ciclismo', 'Pedal base 45 min',
 'Zona 2 com cadência de 80 a 90 rpm.',
 $json${"ambiente":"indoor","blocos":[{"tipo":"resistencia-base","nome":"Resistência Base","tempo":45,"zona_fc":2,"cadencia_alvo":85,"observacao":"Cadência 80–90 rpm"}]}$json$::jsonb, 10),
('ciclismo-intervalado-morro', 'ciclismo', 'Intervalado em morro',
 '8 subidas de 2 min; a descida serve de recuperação.',
 $json${"ambiente":"outdoor","blocos":[{"tipo":"subidas","nome":"Subidas","series":8,"tempo_serie":120,"descanso":120,"observacao":"Descida como recuperação"}]}$json$::jsonb, 20),
('ciclismo-endurance-90', 'ciclismo', 'Endurance 90 min',
 'Ritmo constante em zona aeróbica.',
 $json${"ambiente":"indoor","blocos":[{"tipo":"resistencia-base","nome":"Resistência Base","tempo":90,"zona_fc":2,"observacao":"Ritmo constante"}]}$json$::jsonb, 30),
-- ----- Brick (ciclismo + corrida) -----
('brick-classico', 'brick', 'Brick clássico',
 '30 min de bike e 15 min de corrida logo em seguida.',
 $json${"blocos_bike":[{"tipo":"resistencia-base","nome":"Fundo (Base)","tempo":30,"zona_fc":3}],
   "blocos_corrida":[{"tipo":"aerobico-base","nome":"Corrida pós-bike","tempo":15,"zona_fc":3}]}$json$::jsonb, 10),
('brick-transicao', 'brick', 'Brick de transição',
 '45 min de bike e 20 min de corrida, com foco na transição (T2).',
 $json${"blocos_bike":[{"tipo":"resistencia-base","nome":"Fundo (Base)","tempo":45,"zona_fc":3}],
   "transicao_segundos":90,
   "blocos_corrida":[{"tipo":"aerobico-base","nome":"Corrida pós-bike","tempo":20,"zona_fc":3,"observacao":"Foco em sair da T2 já no ritmo"}]}$json$::jsonb, 20)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
