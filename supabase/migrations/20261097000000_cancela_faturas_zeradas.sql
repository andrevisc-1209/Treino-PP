-- ============================================================
-- Faturas de R$ 0,00 abertas ou enviadas passam a "cancelada"
--
-- Motivo: o "Fechar ciclo" já permitiu criar fatura sem nada a cobrar. Depois do vencimento, ela aparecia como "Em atraso"
-- no Financeiro, no aviso de Hoje e no sino, com R$ 0,00. O app agora impede esse fechamento e ignora faturas zeradas como
-- atraso; esta migration só limpa as que já existem.
-- Fatura cancelada não conta como ciclo fechado (cicloPendente) e o app apaga a cancelada ao refechar o mesmo ciclo.
-- Não mexe em faturas pagas nem em faturas com valor. Não apaga nada.
-- Reversão: não há como saber quais eram; elas valiam R$ 0,00. Se preciso, reabrir pelo app.
-- ============================================================

BEGIN;

UPDATE treino.faturas
SET status = 'cancelada'
WHERE total <= 0
  AND status IN ('aberta', 'enviada');

COMMIT;
