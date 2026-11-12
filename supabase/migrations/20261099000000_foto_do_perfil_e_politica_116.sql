-- ============================================================
-- Foto do personal na página pública da agenda + Política de Privacidade 1.16 (plano pós-auditoria de UX, PR 3)
--
--   * professional_config.pagina_foto: a foto do personal como imagem PEQUENA (256 x 256, WebP ou JPEG) em data URL, até 60.000 caracteres
--     (~45 KB). Opcional; vazia = a página mostra a inicial do nome. Fica na própria linha do personal, então SOME COM A CONTA na exclusão
--     (finalizar_exclusoes_vencidas apaga a linha) e não deixa arquivo órfão. Por isso não há bucket de Storage.
--   * A foto só é pública se o personal a enviar, e vai para qualquer pessoa com o link da agenda (a Política 1.16 diz isso).
--   * Registra a Política de Privacidade 1.16 em treino.documentos_versoes (foto opcional + 3 eventos novos de uso no app).
-- Reversão: ALTER TABLE treino.professional_config DROP COLUMN pagina_foto;
-- ============================================================

BEGIN;

ALTER TABLE treino.professional_config
  ADD COLUMN pagina_foto TEXT NULL
  CHECK (
    pagina_foto IS NULL
    OR (
      char_length(pagina_foto) <= 60000
      AND (pagina_foto LIKE 'data:image/webp;base64,%' OR pagina_foto LIKE 'data:image/jpeg;base64,%')
    )
  );

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.16')
ON CONFLICT DO NOTHING;

COMMIT;
