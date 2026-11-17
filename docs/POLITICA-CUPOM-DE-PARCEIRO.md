# Política de Privacidade e Termos: cupom de parceiro (para o jurídico)

**Status:** proposta, **ainda não aplicada** (a PR do cupom no app não muda a versão dos documentos: subir a versão exige nova linha em `treino.documentos_versoes` por migration e novo aceite no cadastro; fazer só depois da aprovação).

## O que muda na prática
Quem usa um cupom de parceiro passa a ter, no cadastro, **qual campanha de cupom usou e quantos dias ganhou** (tabela de resgates). Serve para o parceiro e o Personal Perto medirem o resultado da ação (quantos cadastros, quantos ativaram, quantos pagaram) e para impedir uso repetido ou acima do limite.

- **Dado guardado:** o código da campanha usada, a data do resgate e os dias concedidos (e, se o código foi digitado errado muitas vezes, a data das tentativas, apagadas em 1 dia).
- **Quem vê:** o admin, em números por campanha (resgates, ativados e pagantes). Nunca dado de aluno nem de saúde.
- **O parceiro não recebe dados pessoais** da pessoa: só o total da campanha, se houver relatório.

## Texto sugerido (Política, seção 3, depois do parágrafo "Origem do seu cadastro")
> **Cupom de parceiro.** Se você usar um código de cupom ao criar a conta, guardamos qual campanha de cupom você usou, a data e quantos dias grátis recebeu. Usamos isso para conceder os dias, evitar uso repetido ou acima do limite da campanha e saber quais parcerias trazem Personal Trainers, vendo só o resultado somado por campanha. Não repassamos ao parceiro seu nome, contato ou qualquer dado seu.

## Texto sugerido (Termos, nova cláusula)
> **Cupons.** Cupons de parceiros concedem dias grátis a contas novas, uma vez por conta, dentro do período e do limite de cada campanha. Os dias somam-se ao teste e, se você assinar durante eles, o plano pago começa depois do fim dos dias grátis. Podemos recusar ou cancelar cupons usados de forma abusiva (por exemplo, várias contas para obter dias grátis).

## Base legal sugerida
Execução do contrato (conceder o benefício) e legítimo interesse (LGPD, art. 7º, IX): medir parcerias e evitar fraude, com dado mínimo.

## Para aplicar depois da aprovação
1. Atualizar `src/features/legal/textos.ts` (Política e Termos) e subir as versões.
2. Registrar as versões em `treino.documentos_versoes` (nova migration, como nas versões 1.3 a 1.10) e atualizar o teste `versoesRegistradas.test.ts`.
