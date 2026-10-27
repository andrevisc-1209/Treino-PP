// Análise de uso (PostHog) COM consentimento (LGPD). Mesma escolha e mesmo identificador da landing (mesma origem): quem aceitou
// na página inicial já chega aqui "aceito", e a origem da campanha (UTM) que a landing registrou acompanha os eventos abaixo.
// Nada do PostHog é carregado antes do aceite. Sem gravação de sessão, sem cookies (localStorage), sem autocaptura, sem pageview,
// sem identify (nunca liga ao nome, e-mail ou CPF): só os eventos nomeados abaixo, sem dado de aluno nem de saúde.
// Texto correspondente: Política de Privacidade, seção 3 (versão 1.7). Mudou aqui? Mude lá, na mesma PR.

export const CHAVE_CONSENTIMENTO = 'treino_cookie_consent' // a mesma da landing (public/landing.html)
export const PROJETO_POSTHOG = 'phc_ADSqKHpnPUTMktbKN9MKDTCVfjM4AZ8ikor9N6ygMqt7' // chave pública de projeto (vai no navegador por desenho)

export type Escolha = 'accepted' | 'declined' | null

/** Eventos do funil do app. Só nomes fixos: nenhum recebe dado pessoal. */
export type EventoFunil = 'cadastro_aberto' | 'cadastro_enviado' | 'perfil_concluido' | 'aluno_cadastrado'

export function lerEscolha(): Escolha {
  try {
    const v = localStorage.getItem(CHAVE_CONSENTIMENTO)
    return v === 'accepted' || v === 'declined' ? v : null
  } catch {
    return null
  }
}

/** Sinal de privacidade do navegador (Global Privacy Control): conta como recusa. */
export const gpcAtivo = (): boolean => typeof navigator !== 'undefined' && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true

/** O aviso só aparece para quem ainda não escolheu e não enviou o sinal de recusa. */
export const deveAvisar = (escolha: Escolha, gpc: boolean): boolean => escolha === null && !gpc

/** Analytics só roda com aceite explícito (e sem GPC). */
export const podeMedir = (escolha: Escolha, gpc: boolean): boolean => escolha === 'accepted' && !gpc

type Posthog = typeof import('posthog-js').default
let cliente: Promise<Posthog> | null = null

function carregar(): Promise<Posthog> {
  cliente ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(PROJETO_POSTHOG, {
      api_host: 'https://us.i.posthog.com',
      persistence: 'localStorage',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
    })
    return posthog
  })
  return cliente
}

/** Chamado na abertura do app: liga o PostHog só se a pessoa já aceitou (na landing ou aqui). */
export function iniciarSeAceito(): void {
  if (!podeMedir(lerEscolha(), gpcAtivo())) return
  void carregar().catch(() => {}) // bloqueador de anúncios ou rede ruim: o app segue normal
}

/** Registra um evento do funil, se (e só se) houver aceite. Nunca lança erro: medir não pode atrapalhar o uso. */
export function evento(nome: EventoFunil): void {
  if (!podeMedir(lerEscolha(), gpcAtivo())) return
  void carregar()
    .then((ph) => ph.capture(nome))
    .catch(() => {})
}

export function aceitar(): void {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, 'accepted')
  } catch {
    /* sem armazenamento: não há como lembrar a escolha, e nada é medido */
  }
  iniciarSeAceito()
}

/** Recusa ou revoga: apaga o identificador do PostHog neste navegador e nada novo é registrado. */
export function recusar(): void {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, 'declined')
  } catch {
    /* idem */
  }
  const pronto = cliente
  cliente = null
  void pronto?.then((ph) => {
    ph.opt_out_capturing()
    ph.reset()
  })
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ph_') || k.startsWith('__ph'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* idem */
  }
}
