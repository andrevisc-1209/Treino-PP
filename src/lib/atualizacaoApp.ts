/**
 * Verificação de versão nova do app (PWA). O app instalado fica dias em segundo plano sem recarregar, então o navegador quase nunca vai
 * buscar um `sw.js` novo sozinho: quem abre o app continuava na versão velha. Aqui a verificação é pedida de propósito: ao puxar a tela
 * para atualizar, ao voltar para o app depois de um tempo e no botão "Verificar atualização" de Configurações.
 */

/** O pedaço de `ServiceWorkerRegistration` que a verificação usa (permite testar com um objeto de mentira). */
export type RegistroSW = {
  update(): Promise<unknown>
  waiting: unknown | null
  installing: (EventTarget & { state: string }) | null
}

export type ResultadoVerificacao = 'nova' | 'atual' | 'indisponivel'

/**
 * Pergunta ao servidor se há versão nova. 'nova' = já baixada e esperando para entrar; 'atual' = nada novo; 'indisponivel' = sem registro
 * (navegador sem service worker, ou ainda não registrou), sem rede ou demorou demais.
 */
export async function verificarNovaVersao(registro: RegistroSW | undefined, esperaMaxMs = 15_000): Promise<ResultadoVerificacao> {
  if (!registro) return 'indisponivel'
  try {
    await registro.update()
  } catch {
    return 'indisponivel'
  }
  if (registro.waiting) return 'nova'
  const instalando = registro.installing
  if (!instalando) return 'atual'
  // a versão nova foi encontrada e está sendo baixada: espera ficar pronta
  return new Promise<ResultadoVerificacao>((resolve) => {
    const terminar = (r: ResultadoVerificacao) => {
      clearTimeout(timer)
      instalando.removeEventListener('statechange', ouvir)
      resolve(r)
    }
    const ouvir = () => {
      if (instalando.state === 'installed') terminar('nova')
      else if (instalando.state === 'redundant') terminar('atual')
    }
    const timer = setTimeout(() => terminar('indisponivel'), esperaMaxMs)
    instalando.addEventListener('statechange', ouvir)
    ouvir()
  })
}

/** Ao voltar para o app, só verifica de novo se já passou o intervalo (evita uma ida ao servidor a cada troca de aba). */
export function deveVerificarAgora(ultimaVerificacaoMs: number | null, agoraMs: number, intervaloMs = 30 * 60_000): boolean {
  return ultimaVerificacaoMs === null || agoraMs - ultimaVerificacaoMs >= intervaloMs
}

// --- registro e aplicador guardados pelo PwaUpdatePrompt (que é quem chama useRegisterSW) ---
let registro: RegistroSW | undefined
let aplicador: ((recarregar?: boolean) => Promise<void>) | undefined

export const guardarRegistroSW = (r: RegistroSW | undefined) => {
  registro = r
}
export const guardarAplicadorSW = (fn: ((recarregar?: boolean) => Promise<void>) | undefined) => {
  aplicador = fn
}

export const verificarNovaVersaoDoApp = (): Promise<ResultadoVerificacao> => verificarNovaVersao(registro)

/** Ativa a versão que já está esperando e recarrega o app. false = não havia como aplicar. */
export async function aplicarNovaVersao(): Promise<boolean> {
  if (!aplicador) return false
  await aplicador(true)
  return true
}
