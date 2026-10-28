// Modo foco: telas em que a navegação global e os avisos do topo (trial, assinatura vencida) atrapalham. A saída passa a ser o botão da própria tela.
//   - cadastro/edição de aluno e todo o ciclo de uma sessão (pré-treino, execução, pós-treino): ver docs/ux-audit e a tarefa "modo aula";
//   - excluir a conta: não faz sentido mostrar "Assinar agora" logo depois de a pessoa pedir para sair.
const ROTAS_MODO_FOCO = [/^\/alunos\/novo$/, /^\/alunos\/[^/]+\/editar$/, /^\/alunos\/[^/]+\/sessoes\//, /^\/configuracoes\/excluir-conta$/]

export const emModoFoco = (pathname: string): boolean => ROTAS_MODO_FOCO.some((r) => r.test(pathname))
