-- ============================================================
-- Migration: 20261031000000_templates_natacao_banco.sql
--
-- Move os modelos de natação (antes em src/data/natacao-templates.ts) para
-- treino.templates_treino, junto com os de corrida, ciclismo, brick e musculação.
-- Mesmos 10 modelos, mesmo conteúdo. modalidade_detalhes =
--   { "ambiente": "piscina" | "mar", "nivel": "iniciante" | "intermediario" | "avancado",
--     "blocos": [ { exercicio_id, nome, parametros } ] }
-- (exercicio_id é o id da biblioteca de natação do app, não um UUID).
-- Idempotente: ON CONFLICT (slug) DO NOTHING.
-- ============================================================

BEGIN;

INSERT INTO treino.templates_treino (slug, modalidade, nome, descricao, modalidade_detalhes, ordem) VALUES
('natacao-iniciante-adaptacao', 'natacao', 'Iniciante — Adaptação',
 'Primeiro contato com piscina. Foco em conforto na água e respiração básica.',
 $json${"ambiente":"piscina","nivel":"iniciante","blocos":[{"exercicio_id":"head-up","nome":"Nado Polo (Head-up)","parametros":{"distancia":100,"series":2,"descanso":60}},{"exercicio_id":"prancha","nome":"Prancha","parametros":{"distancia":200,"series":2,"descanso":45}},{"exercicio_id":"crawl","nome":"Crawl (Livre)","parametros":{"distancia":100,"series":3,"descanso":60}},{"exercicio_id":"catch-up","nome":"Catch-up (Piteira)","parametros":{"distancia":100,"series":1,"descanso":45}}]}$json$::jsonb, 10),
('natacao-iniciante-base', 'natacao', 'Iniciante — Base Aeróbica',
 'Construção de base aeróbica e primeiro contato com 4 estilos.',
 $json${"ambiente":"piscina","nivel":"iniciante","blocos":[{"exercicio_id":"crawl","nome":"Crawl (Livre)","parametros":{"distancia":400,"series":1,"descanso":30}},{"exercicio_id":"prancha","nome":"Prancha","parametros":{"distancia":200,"series":2,"descanso":30}},{"exercicio_id":"costas","nome":"Costas","parametros":{"distancia":100,"series":2,"descanso":45}},{"exercicio_id":"peito","nome":"Peito","parametros":{"distancia":100,"series":2,"descanso":45}},{"exercicio_id":"crawl","nome":"Crawl — Soltura","parametros":{"distancia":200,"series":1,"descanso":0}}]}$json$::jsonb, 20),
('natacao-intermediario-forca', 'natacao', 'Intermediário — Força',
 'Desenvolvimento de potência com acessórios de resistência.',
 $json${"ambiente":"piscina","nivel":"intermediario","blocos":[{"exercicio_id":"crawl","nome":"Aquecimento Crawl","parametros":{"distancia":400,"series":1,"descanso":30}},{"exercicio_id":"pe-de-pato","nome":"Nadadeiras (Pé de Pato)","parametros":{"distancia":800,"series":1,"descanso":60}},{"exercicio_id":"boia-palmar","nome":"Boia + Palmar","parametros":{"distancia":400,"series":2,"descanso":60}},{"exercicio_id":"paraquedas","nome":"Paraquedas de Arraste","parametros":{"distancia":100,"series":4,"descanso":90}},{"exercicio_id":"crawl","nome":"Soltura","parametros":{"distancia":300,"series":1,"descanso":0}}]}$json$::jsonb, 30),
('natacao-intermediario-resistencia', 'natacao', 'Intermediário — Resistência',
 'Volume moderado com trabalho de hipóxia e negative split.',
 $json${"ambiente":"piscina","nivel":"intermediario","blocos":[{"exercicio_id":"crawl","nome":"Aquecimento","parametros":{"distancia":500,"series":1,"descanso":30}},{"exercicio_id":"hipoxia","nome":"Hipóxia (3-5-7)","parametros":{"distancia":400,"series":2,"descanso":60,"observacao":"Alternar ciclos de respiração 3-5-7"}},{"exercicio_id":"negative-split","nome":"Negative Split","parametros":{"distancia":200,"series":4,"descanso":45}},{"exercicio_id":"aerobico","nome":"Série Aeróbica","parametros":{"distancia":800,"series":1,"descanso":60}},{"exercicio_id":"crawl","nome":"Soltura","parametros":{"distancia":300,"series":1,"descanso":0}}]}$json$::jsonb, 40),
('natacao-intermediario-tecnica-2000', 'natacao', 'Técnica 2.000 m',
 'Série de técnica: braçada, pernada e educativos. Aproveite a soltura para treinar viradas e chegadas.',
 $json${"ambiente":"piscina","nivel":"intermediario","blocos":[{"exercicio_id":"crawl","nome":"Aquecimento","parametros":{"distancia":400,"series":1,"descanso":30}},{"exercicio_id":"catch-up","nome":"Catch-up (Piteira)","parametros":{"distancia":100,"series":4,"descanso":20}},{"exercicio_id":"um-braco","nome":"1 Braço (Alternado)","parametros":{"distancia":100,"series":4,"descanso":20}},{"exercicio_id":"punho-fechado","nome":"Punho Fechado (Fist)","parametros":{"distancia":100,"series":4,"descanso":20}},{"exercicio_id":"perna-lateral","nome":"6-Kick Switch (Perna Lateral)","parametros":{"distancia":50,"series":4,"descanso":20}},{"exercicio_id":"crawl","nome":"Soltura — viradas e chegadas","parametros":{"distancia":200,"series":1,"descanso":0,"observacao":"Treinar virada e chegada na parede"}}]}$json$::jsonb, 50),
('natacao-intermediario-resistencia-3000', 'natacao', 'Resistência 3.000 m',
 '500 m de aquecimento, 2.000 m de série principal e 500 m de desaquecimento.',
 $json${"ambiente":"piscina","nivel":"intermediario","blocos":[{"exercicio_id":"crawl","nome":"Aquecimento","parametros":{"distancia":500,"series":1,"descanso":30}},{"exercicio_id":"aerobico","nome":"Série Principal 4 × 500 m","parametros":{"distancia":500,"series":4,"descanso":30}},{"exercicio_id":"crawl","nome":"Desaquecimento","parametros":{"distancia":500,"series":1,"descanso":0}}]}$json$::jsonb, 60),
('natacao-avancado-velocidade', 'natacao', 'Avançado — Velocidade',
 'Foco em sprints ATP-CP, race pace e ativação de fibras tipo II.',
 $json${"ambiente":"piscina","nivel":"avancado","blocos":[{"exercicio_id":"medley","nome":"Aquecimento Medley","parametros":{"distancia":400,"series":1,"descanso":30}},{"exercicio_id":"elastico","nome":"Elástico Estático","parametros":{"tempo":30,"series":6,"descanso":120}},{"exercicio_id":"sprint","nome":"Sprints 25m","parametros":{"distancia":25,"series":10,"descanso":90}},{"exercicio_id":"race-pace","nome":"Race Pace 100m","parametros":{"distancia":100,"series":6,"descanso":60}},{"exercicio_id":"descendente","nome":"Série Descendente","parametros":{"distancia":100,"series":4,"descanso":45}},{"exercicio_id":"crawl","nome":"Soltura","parametros":{"distancia":400,"series":1,"descanso":0}}]}$json$::jsonb, 70),
('natacao-avancado-longo', 'natacao', 'Avançado — Treino Longo',
 'Volume alto com trabalho aeróbico e educativos técnicos.',
 $json${"ambiente":"piscina","nivel":"avancado","blocos":[{"exercicio_id":"crawl","nome":"Aquecimento","parametros":{"distancia":1000,"series":1,"descanso":30}},{"exercicio_id":"punho-fechado","nome":"Punho Fechado","parametros":{"distancia":400,"series":2,"descanso":30}},{"exercicio_id":"aerobico","nome":"Série Aeróbica","parametros":{"distancia":1500,"series":1,"descanso":60}},{"exercicio_id":"pe-pato-palmar","nome":"Pé de Pato + Palmar","parametros":{"distancia":800,"series":1,"descanso":60}},{"exercicio_id":"hipoxia","nome":"Hipóxia","parametros":{"distancia":400,"series":2,"descanso":45}},{"exercicio_id":"crawl","nome":"Soltura","parametros":{"distancia":500,"series":1,"descanso":0}}]}$json$::jsonb, 80),
('natacao-mar-iniciante', 'natacao', 'Mar Aberto — Iniciante',
 'Adaptação ao mar aberto. Navegação por ondas e orientação sem linha.',
 $json${"ambiente":"mar","nivel":"iniciante","blocos":[{"exercicio_id":"mar-head-up","nome":"Head-up — Adaptação","parametros":{"tempo":600,"series":1,"descanso":120,"observacao":"Focar na orientação visual"}},{"exercicio_id":"mar-ondas","nome":"Passagem por Ondas","parametros":{"tempo":600,"series":2,"descanso":120}},{"exercicio_id":"mar-crawl","nome":"Crawl em Mar Aberto","parametros":{"tempo":900,"series":1,"descanso":120}}]}$json$::jsonb, 90),
('natacao-mar-avancado', 'natacao', 'Mar Aberto — Percurso Longo',
 'Percurso longo com fartlek. Ideal para preparação de provas de águas abertas.',
 $json${"ambiente":"mar","nivel":"avancado","blocos":[{"exercicio_id":"mar-crawl","nome":"Aquecimento Mar","parametros":{"tempo":600,"series":1,"descanso":60}},{"exercicio_id":"mar-percurso","nome":"Percurso Principal","parametros":{"tempo":3600,"series":1,"descanso":120,"observacao":"~3km em ritmo moderado"}},{"exercicio_id":"mar-fartlek","nome":"Fartlek Final","parametros":{"tempo":1200,"series":1,"descanso":60}},{"exercicio_id":"mar-crawl","nome":"Soltura","parametros":{"tempo":600,"series":1,"descanso":0}}]}$json$::jsonb, 100)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
