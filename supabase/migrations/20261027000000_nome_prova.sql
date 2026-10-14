-- Nome livre da prova alvo (ex.: "Ironman Floripa 2027", "São Silvestre 2026"). Até 60 caracteres, opcional.
ALTER TABLE treino.alunos
  ADD COLUMN IF NOT EXISTS nome_prova TEXT NULL CHECK (char_length(nome_prova) <= 60);
